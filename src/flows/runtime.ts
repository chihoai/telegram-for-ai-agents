import type { Dialog } from '@mtcute/node';
import type { AppContext } from '../app/context.js';
import { requireDb } from '../app/db.js';
import { requireAccountId } from '../app/account.js';
import {
  getPeerCompany,
  getSummary,
  linkPeerCompany,
  listPeerTags,
  listTasksForPeer,
  setPeerTags,
  addTask,
  upsertSummary,
  listTasksToday,
} from '../db/crm.js';
import {
  appendFlowRunStep,
  createFlowRun,
  updateFlowRun,
  type FlowRunRow,
} from '../db/flows.js';
import { upsertPeer } from '../db/writes.js';
import { sendGuardedMessage } from '../services/outbound.js';
import {
  buildAiConversation,
  ensureAuthorized,
  fetchChatHistory,
  listDialogs,
} from '../services/telegram.js';
import { getFlowDefinition } from './catalog.js';
import { BudgetExceededError, FlowBudgetTracker } from './budget.js';
import type {
  FlowCandidateSnapshot,
  FlowDefinition,
  FlowPlanCandidate,
  FlowRunStatus,
} from './types.js';

function daysBetween(now: Date, other: Date | null): number {
  if (!other) return Number.POSITIVE_INFINITY;
  return (now.getTime() - other.getTime()) / (1000 * 60 * 60 * 24);
}

function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function defaultTaskWhy(flow: FlowDefinition, candidate: FlowCandidateSnapshot): string {
  return `${flow.name}: follow up with ${candidate.peerDisplayName}`;
}

async function discoverFlowCandidates(
  ctx: AppContext,
  accountId: bigint,
  flow: FlowDefinition,
  tracker: FlowBudgetTracker,
): Promise<FlowCandidateSnapshot[]> {
  const db = requireDb(ctx);
  const now = new Date();
  const limit = Math.min(Math.max(flow.discover.limit * 4, 20), 60);
  const dialogs = await listDialogs(ctx.telegram, { all: false, limit });
  const dueTasks = await listTasksToday(db, { accountId });
  const dueTaskPeerIds = new Set(dueTasks.map((task) => task.peerId));

  const candidates: Array<{
    dialog: Dialog;
    snapshot: FlowCandidateSnapshot;
    staleScore: number;
  }> = [];

  for (const dialog of dialogs) {
    const tags = (await listPeerTags(db, { accountId, peerId: dialog.peer.id })).map((row) => row.tag);
    const openTasks = (await listTasksForPeer(db, { accountId, peerId: dialog.peer.id })).filter(
      (task) => task.status === 'open',
    );
    const company = await getPeerCompany(db, {
      accountId,
      peerId: dialog.peer.id,
    });
    const summary = await getSummary(db, {
      accountId,
      peerId: dialog.peer.id,
      kind: 'rolling',
    });
    const lastMessageAt = dialog.lastMessage?.date ?? null;
    const staleScore = daysBetween(now, lastMessageAt);

    if (
      flow.discover.requiredAnyTags &&
      !flow.discover.requiredAnyTags.some((tag) =>
        tags.some((existingTag) => existingTag.toLowerCase() === tag.toLowerCase()),
      )
    ) {
      continue;
    }

    if (
      flow.discover.excludedTags &&
      flow.discover.excludedTags.some((tag) =>
        tags.some((existingTag) => existingTag.toLowerCase() === tag.toLowerCase()),
      )
    ) {
      continue;
    }

    if (
      flow.discover.minUnreadCount !== undefined &&
      dialog.unreadCount < flow.discover.minUnreadCount
    ) {
      continue;
    }

    if (
      flow.discover.staleDays !== undefined &&
      staleScore < flow.discover.staleDays
    ) {
      continue;
    }

    if (flow.discover.mode === 'due_tasks' && !dueTaskPeerIds.has(dialog.peer.id)) {
      continue;
    }

    const history = await fetchChatHistory(ctx.telegram, {
      chatId: String(dialog.peer.id),
      limit: flow.discover.maxHistoryMessages ?? 12,
    });

    const snapshot: FlowCandidateSnapshot = {
      peerId: dialog.peer.id,
      peerDisplayName: dialog.peer.displayName,
      username: dialog.peer.username ?? null,
      peerKind: dialog.peer.type,
      unreadCount: dialog.unreadCount,
      archived: dialog.isArchived,
      pinned: dialog.isPinned,
      lastMessageId: dialog.lastMessage?.id ?? null,
      lastMessageAt: isoOrNull(lastMessageAt),
      tags,
      companyName: company?.companyName ?? null,
      role: company?.role ?? null,
      openTasks: openTasks.map((task) => ({
        taskId: task.taskId,
        dueAt: task.dueAt.toISOString(),
        why: task.why,
        priority: task.priority,
        status: task.status,
      })),
      rollingSummary: summary?.content ?? null,
      recentMessages: buildAiConversation(history),
    };

    candidates.push({ dialog, snapshot, staleScore });
  }

  const sorted = candidates.sort((left, right) => {
    if (flow.discover.mode === 'unread_dialogs') {
      return right.dialog.unreadCount - left.dialog.unreadCount;
    }
    if (flow.discover.mode === 'due_tasks') {
      return left.staleScore - right.staleScore;
    }
    if (flow.discover.staleDays !== undefined) {
      return right.staleScore - left.staleScore;
    }
    return (
      (right.dialog.lastMessage?.date.getTime() ?? 0) -
      (left.dialog.lastMessage?.date.getTime() ?? 0)
    );
  });

  const limited = sorted
    .slice(0, Math.min(flow.discover.limit, flow.budget.maxCandidates))
    .map((item) => item.snapshot);
  tracker.assertCandidateCount(limited.length);
  return limited;
}

async function withRetries<T>(
  tracker: FlowBudgetTracker,
  retries: number,
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      tracker.assertWallTime();
      return { result: await fn(), attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt > retries) {
        throw error;
      }
      tracker.consumeRetry(label);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function runFlow(
  ctx: AppContext,
  params: { flowId: string; dryRun?: boolean },
): Promise<{
  ok: boolean;
  runId: number;
  flowId: string;
  status: FlowRunStatus;
  summary: string;
  finalOutputs: Record<string, unknown>;
}> {
  if (!ctx.ai) {
    throw new Error(
      'AI mode is not configured. Set AI_MODE=gemini with GEMINI_API_KEY or AI_MODE=openclaw with OPENCLAW_BASE_URL.',
    );
  }

  const db = requireDb(ctx);
  const accountId = await requireAccountId(ctx);
  const flow = await getFlowDefinition(params.flowId);

  await ensureAuthorized(ctx.telegram);

  const tracker = new FlowBudgetTracker(flow.budget);
  const candidates = await discoverFlowCandidates(ctx, accountId, flow, tracker);
  const runId = await createFlowRun(db, {
    accountId,
    flowId: flow.id,
    status: 'running',
    definitionSnapshot: flow,
    discoverSnapshot: { candidates },
    budgetSnapshot: tracker.snapshot(),
  });

  let stepIndex = 0;
  const nextStepIndex = () => {
    stepIndex += 1;
    return stepIndex;
  };

  await appendFlowRunStep(db, {
    runId,
    stepIndex: nextStepIndex(),
    stepType: 'discover',
    toolName: 'dialogs.list',
    status: 'succeeded',
    attempt: 1,
    toolResult: { candidates },
    verification: { candidateCount: candidates.length },
  });

  if (candidates.length === 0) {
    const finalOutputs = {
      actedPeers: [],
      blockedPeers: [],
      createdTasks: [],
      sentMessages: [],
      tagUpdates: [],
      companyLinks: [],
      team_handoff_recommended: false,
      handoff_note: null,
    };
    await updateFlowRun(db, {
      runId,
      status: 'completed',
      summary: 'No candidates matched the flow discovery criteria.',
      budgetSnapshot: tracker.snapshot(),
      finalOutputs,
      finished: true,
    });
    return {
      ok: true,
      runId,
      flowId: flow.id,
      status: 'completed',
      summary: 'No candidates matched the flow discovery criteria.',
      finalOutputs,
    };
  }

  try {
    tracker.consumeAiCall('flow.planner');
    const planResult = await withRetries(
      tracker,
      flow.budget.maxRetriesPerStep,
      'flow.planner',
      () => ctx.ai!.planFlow({ flow, candidates }),
    );
    const plan = planResult.result;
    await appendFlowRunStep(db, {
      runId,
      stepIndex: nextStepIndex(),
      stepType: 'plan',
      status: 'succeeded',
      attempt: planResult.attempts,
      decision: plan as unknown as Record<string, unknown>,
      verification: { planCount: plan.plans.length },
    });

    const candidateMap = new Map(candidates.map((candidate) => [candidate.peerId, candidate]));
    const finalOutputs: Record<string, unknown> = {
      actedPeers: [],
      blockedPeers: [],
      createdTasks: [],
      sentMessages: [],
      tagUpdates: [],
      companyLinks: [],
      team_handoff_recommended: false,
      handoff_note: null,
      dryRun: Boolean(params.dryRun),
    };

    let runStatus: FlowRunStatus = 'completed';

    for (const planned of plan.plans) {
      const candidate = candidateMap.get(planned.peerId);
      if (!candidate || !planned.shouldAct) {
        continue;
      }

      const peer = await ctx.telegram.getPeer(planned.peerId);
      await upsertPeer(db, { accountId, peer });
      const peerActions: Record<string, unknown> = {
        peerId: candidate.peerId,
        peerDisplayName: candidate.peerDisplayName,
        reason: planned.reason,
      };

      if (planned.refreshSummary) {
        tracker.consumeToolCall('summary.refresh');
        tracker.consumeAiCall('summary.refresh');
        const summaryResult = await withRetries(
          tracker,
          flow.budget.maxRetriesPerStep,
          'summary.refresh',
          async () => {
            const history = await fetchChatHistory(ctx.telegram, {
              chatId: String(candidate.peerId),
              limit: 50,
            });
            const rolling = await ctx.ai!.summarize({
              peerDisplayName: candidate.peerDisplayName,
              messages: buildAiConversation(history),
            });
            await upsertSummary(db, {
              accountId,
              peerId: candidate.peerId,
              kind: 'rolling',
              content: rolling.summary,
              sourceModel: `${ctx.ai!.mode}:${ctx.ai!.model}`,
            });
            return rolling.summary;
          },
        );
        const storedSummary = await getSummary(db, {
          accountId,
          peerId: candidate.peerId,
          kind: 'rolling',
        });
        await appendFlowRunStep(db, {
          runId,
          stepIndex: nextStepIndex(),
          stepType: 'refresh_summary',
          toolName: 'summary.refresh',
          status: 'succeeded',
          attempt: summaryResult.attempts,
          toolArgs: { peer: String(candidate.peerId) },
          toolResult: { summary: summaryResult.result },
          verification: {
            updated: Boolean(storedSummary?.content),
          },
        });
        peerActions.summary = summaryResult.result;
      }

      if (planned.setTags.length > 0) {
        tracker.consumeToolCall('tags.set');
        await setPeerTags(db, {
          accountId,
          peerId: candidate.peerId,
          tags: planned.setTags,
          source: 'rule',
        });
        const appliedTags = await listPeerTags(db, {
          accountId,
          peerId: candidate.peerId,
        });
        await appendFlowRunStep(db, {
          runId,
          stepIndex: nextStepIndex(),
          stepType: 'set_tags',
          toolName: 'tags.set',
          status: 'succeeded',
          attempt: 1,
          toolArgs: { peer: String(candidate.peerId), tags: planned.setTags },
          verification: {
            tags: appliedTags.map((item) => item.tag),
          },
        });
        (finalOutputs.tagUpdates as Array<Record<string, unknown>>).push({
          peerId: candidate.peerId,
          tags: planned.setTags,
        });
      }

      if (planned.companyName) {
        tracker.consumeToolCall('company.link');
        await linkPeerCompany(db, {
          accountId,
          peerId: candidate.peerId,
          companyName: planned.companyName,
          role: planned.role ?? undefined,
          source: 'rule',
        });
        const linkedCompany = await getPeerCompany(db, {
          accountId,
          peerId: candidate.peerId,
        });
        await appendFlowRunStep(db, {
          runId,
          stepIndex: nextStepIndex(),
          stepType: 'link_company',
          toolName: 'company.link',
          status: 'succeeded',
          attempt: 1,
          toolArgs: {
            peer: String(candidate.peerId),
            company: planned.companyName,
            role: planned.role,
          },
          verification: linkedCompany
            ? {
                companyName: linkedCompany.companyName,
                role: linkedCompany.role,
              }
            : null,
        });
        (finalOutputs.companyLinks as Array<Record<string, unknown>>).push({
          peerId: candidate.peerId,
          companyName: planned.companyName,
          role: planned.role,
        });
      }

      if (planned.createTask) {
        tracker.consumeToolCall('tasks.add');
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + (planned.dueInDays ?? 1));
        const taskId = await addTask(db, {
          accountId,
          peerId: candidate.peerId,
          dueAt,
          why: planned.taskWhy ?? defaultTaskWhy(flow, candidate),
          priority: planned.taskPriority,
        });
        const tasks = await listTasksForPeer(db, {
          accountId,
          peerId: candidate.peerId,
        });
        await appendFlowRunStep(db, {
          runId,
          stepIndex: nextStepIndex(),
          stepType: 'create_task',
          toolName: 'tasks.add',
          status: 'succeeded',
          attempt: 1,
          toolArgs: {
            peer: String(candidate.peerId),
            dueAt: dueAt.toISOString(),
            why: planned.taskWhy ?? defaultTaskWhy(flow, candidate),
            priority: planned.taskPriority,
          },
          toolResult: { taskId },
          verification: {
            taskPresent: tasks.some((task) => task.taskId === taskId),
          },
        });
        (finalOutputs.createdTasks as Array<Record<string, unknown>>).push({
          peerId: candidate.peerId,
          taskId,
          dueAt: dueAt.toISOString(),
        });
      }

      if (planned.sendSuggested && flow.guardrails.allowSend) {
        tracker.consumeToolCall('nudge.generate');
        tracker.consumeAiCall('nudge.generate');
        const nudgeResult = await withRetries(
          tracker,
          flow.budget.maxRetriesPerStep,
          'nudge.generate',
          () =>
            ctx.ai!.nudge(
              {
                peerDisplayName: candidate.peerDisplayName,
                messages: candidate.recentMessages,
              },
              {
                style: planned.sendStyle,
                avoidQuestion: planned.avoidQuestion,
              },
            ),
        );
        await appendFlowRunStep(db, {
          runId,
          stepIndex: nextStepIndex(),
          stepType: 'generate_nudge',
          toolName: 'nudge.generate',
          status: 'succeeded',
          attempt: nudgeResult.attempts,
          toolResult: { nudge: nudgeResult.result.nudge },
        });

        tracker.consumeToolCall('messages.send');
        const sendResult = await sendGuardedMessage(ctx, {
          accountId,
          runId,
          peerRef: String(candidate.peerId),
          text: nudgeResult.result.nudge,
          reason: planned.reason,
          expectedLastMessageId: candidate.lastMessageId ?? undefined,
          maxInactiveDays: flow.guardrails.maxInactiveDays,
          dedupeWindowDays: flow.guardrails.dedupeWindowDays,
          dryRun: params.dryRun,
        });
        await appendFlowRunStep(db, {
          runId,
          stepIndex: nextStepIndex(),
          stepType: 'send_message',
          toolName: 'messages.send',
          status: sendResult.sent ? 'succeeded' : sendResult.blocked ? 'blocked' : 'planned',
          attempt: 1,
          toolArgs: {
            peer: String(candidate.peerId),
            text: nudgeResult.result.nudge,
            flowRun: runId,
          },
          toolResult: sendResult as unknown as Record<string, unknown>,
          verification: sendResult.verification,
        });

        if (sendResult.sent) {
          tracker.consumeOutboundMessage('messages.send');
          (finalOutputs.sentMessages as Array<Record<string, unknown>>).push({
            peerId: candidate.peerId,
            telegramMessageId: sendResult.telegramMessageId,
            text: nudgeResult.result.nudge,
          });
        } else if (sendResult.blocked) {
          runStatus = 'handoff_required';
          finalOutputs.team_handoff_recommended = true;
          finalOutputs.handoff_note =
            planned.handoffNote ??
            `Guardrail blocked send to ${candidate.peerDisplayName}: ${sendResult.failures.join('; ')}`;
          (finalOutputs.blockedPeers as Array<Record<string, unknown>>).push({
            peerId: candidate.peerId,
            failures: sendResult.failures,
          });

          tracker.consumeToolCall('tasks.add');
          const fallbackDueAt = new Date();
          fallbackDueAt.setDate(fallbackDueAt.getDate() + 1);
          const fallbackTaskId = await addTask(db, {
            accountId,
            peerId: candidate.peerId,
            dueAt: fallbackDueAt,
            why: `Guardrail blocked send: ${sendResult.failures.join('; ')}`,
            priority: 'high',
          });
          await appendFlowRunStep(db, {
            runId,
            stepIndex: nextStepIndex(),
            stepType: 'fallback_task',
            toolName: 'tasks.add',
            status: 'succeeded',
            attempt: 1,
            toolArgs: {
              peer: String(candidate.peerId),
              dueAt: fallbackDueAt.toISOString(),
              why: `Guardrail blocked send: ${sendResult.failures.join('; ')}`,
              priority: 'high',
            },
            toolResult: { taskId: fallbackTaskId },
          });
          (finalOutputs.createdTasks as Array<Record<string, unknown>>).push({
            peerId: candidate.peerId,
            taskId: fallbackTaskId,
            dueAt: fallbackDueAt.toISOString(),
            fallback: true,
          });
        }
      }

      if (planned.handoffNote) {
        finalOutputs.team_handoff_recommended = true;
        finalOutputs.handoff_note = planned.handoffNote;
        if (runStatus === 'completed') {
          runStatus = 'handoff_required';
        }
      }

      (finalOutputs.actedPeers as Array<Record<string, unknown>>).push(peerActions);
    }

    await updateFlowRun(db, {
      runId,
      status: runStatus,
      summary: plan.globalSummary,
      plannerSnapshot: plan,
      budgetSnapshot: tracker.snapshot(),
      finalOutputs,
      finished: true,
    });

    return {
      ok: true,
      runId,
      flowId: flow.id,
      status: runStatus,
      summary: plan.globalSummary,
      finalOutputs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedStatus: FlowRunStatus =
      error instanceof BudgetExceededError ? 'aborted' : 'failed';
    await appendFlowRunStep(db, {
      runId,
      stepIndex: nextStepIndex(),
      stepType: 'failure',
      status: failedStatus,
      attempt: 1,
      error: message,
    });
    await updateFlowRun(db, {
      runId,
      status: failedStatus,
      budgetSnapshot: tracker.snapshot(),
      error: message,
      finished: true,
    });
    throw error;
  }
}

export async function getFlowRunForExport(
  ctx: AppContext,
  runId: number,
): Promise<FlowRunRow> {
  const db = requireDb(ctx);
  const accountId = await requireAccountId(ctx);
  const { getFlowRun } = await import('../db/flows.js');
  const run = await getFlowRun(db, { accountId, runId });
  if (!run) {
    throw new Error(`Flow run not found: ${runId}`);
  }
  return run;
}
