import type { AppContext } from '../app/context.js';
import { parseCommandArgs, optionValue, parsePositiveInt } from '../app/cli-args.js';
import { requireDb } from '../app/db.js';
import { requireAccountId } from '../app/account.js';
import {
  buildAiConversation,
  ensureAuthorized,
  fetchChatHistory,
  listDialogs,
} from '../services/telegram.js';
import {
  addAutomationRule,
  addRuleEvent,
  addTask,
  listAutomationRules,
  listRuleEvents,
  setPeerTags,
} from '../db/crm.js';
import { upsertPeer } from '../db/writes.js';
import { printJson } from '../output.js';

export async function runRules(ctx: AppContext, args: string[]): Promise<void> {
  const db = requireDb(ctx);
  const accountId = await requireAccountId(ctx);

  const sub = args[0];
  if (!sub) {
    throw new Error('Usage: tgchats rules <list|add|run|log> ...');
  }

  if (sub === 'list') {
    const rules = await listAutomationRules(db, { accountId });
    if (rules.length === 0) {
      if (ctx.config.jsonOutput) {
        printJson({ ok: true, count: 0, rules: [] });
        return;
      }
      console.log('No rules configured.');
      return;
    }
    if (ctx.config.jsonOutput) {
      printJson({ ok: true, count: rules.length, rules });
      return;
    }
    for (const rule of rules) {
      console.log(
        `#${rule.ruleId} | ${rule.enabled ? 'on' : 'off'} | "${rule.containsText}" -> tag=${rule.setTag ?? '-'} followup=${rule.followupDays ?? '-'}`,
      );
    }
    return;
  }

  if (sub === 'add') {
    const parsed = parseCommandArgs(args.slice(1), [
      '--name',
      '--contains',
      '--instruction',
      '--tag',
      '--followup-days',
    ]);
    const name = optionValue(parsed, ['--name']);
    const contains = optionValue(parsed, ['--instruction', '--contains']);
    const tag = optionValue(parsed, ['--tag']);
    const followupDaysRaw = optionValue(parsed, ['--followup-days']);

    if (!name || !contains) {
      throw new Error(
        'Usage: tgchats rules add --name "pricing followup" --instruction "if they ask pricing" [--tag Lead] [--followup-days 1]',
      );
    }

    const followupDays = followupDaysRaw
      ? parsePositiveInt(followupDaysRaw, '--followup-days')
      : undefined;
    const ruleId = await addAutomationRule(db, {
      accountId,
      name,
      containsText: contains,
      setTag: tag,
      followupDays,
    });
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        rule: {
          ruleId,
          name,
          instruction: contains,
          defaultTag: tag ?? null,
          defaultFollowupDays: followupDays ?? null,
        },
      });
      return;
    }
    console.log(`Rule #${ruleId} created.`);
    return;
  }

  if (sub === 'run') {
    if (!ctx.ai) {
      throw new Error(
        'AI mode is not configured. Set AI_MODE=gemini with GEMINI_API_KEY or AI_MODE=openclaw with OPENCLAW_BASE_URL.',
      );
    }

    await ensureAuthorized(ctx.telegram);
    const rules = await listAutomationRules(db, { accountId });
    const activeRules = rules.filter((rule) => rule.enabled);
    if (activeRules.length === 0) {
      if (ctx.config.jsonOutput) {
        printJson({ ok: true, matches: 0, actions: 0, events: [] });
        return;
      }
      console.log('No enabled rules.');
      return;
    }

    const dialogs = await listDialogs(ctx.telegram, { all: false, limit: 200 });
    let matchedCount = 0;
    let actionCount = 0;
    const events: Array<{
      ruleId: number;
      ruleName: string;
      peerId: number;
      peerDisplayName: string;
      matched: boolean;
      reason: string;
      tagApplied: string | null;
      taskCreated: boolean;
      taskDueAt: string | null;
      priority: 'low' | 'med' | 'high';
    }> = [];
    for (const dialog of dialogs) {
      const history = await fetchChatHistory(ctx.telegram, {
        chatId: String(dialog.peer.id),
        limit: 25,
      });
      if (history.length === 0) continue;

      await upsertPeer(db, { accountId, peer: dialog.peer });
      for (const rule of activeRules) {
        const evaluation = await ctx.ai.evaluateRule({
          context: {
            peerDisplayName: dialog.peer.displayName,
            messages: buildAiConversation(history),
          },
          ruleName: rule.name,
          instruction: rule.containsText,
        });
        if (!evaluation.matched) continue;
        matchedCount += 1;

        const resolvedTag = evaluation.setTag ?? rule.setTag;
        if (resolvedTag) {
          await setPeerTags(db, {
            accountId,
            peerId: dialog.peer.id,
            tags: [resolvedTag],
            source: 'rule',
          });
          actionCount += 1;
        }

        const resolvedFollowupDays =
          evaluation.dueInDays ?? (rule.followupDays && rule.followupDays > 0 ? rule.followupDays : null);
        const shouldCreateTask =
          evaluation.shouldCreateTask ||
          (rule.followupDays !== null && rule.followupDays !== undefined && rule.followupDays > 0);
        let taskDueAtIso: string | null = null;

        if (shouldCreateTask) {
          const followupDays = resolvedFollowupDays ?? 1;
          const dueAt = new Date();
          dueAt.setDate(dueAt.getDate() + followupDays);
          taskDueAtIso = dueAt.toISOString();
          await addTask(db, {
            accountId,
            peerId: dialog.peer.id,
            dueAt,
            why: evaluation.why ?? `Automation rule "${rule.name}" matched`,
            priority: evaluation.priority,
          });
          actionCount += 1;
        }

        await addRuleEvent(db, {
          accountId,
          ruleId: rule.ruleId,
          peerId: dialog.peer.id,
          note: `${dialog.peer.displayName}: ${evaluation.reason} | tag=${resolvedTag ?? '-'} | task=${shouldCreateTask ? 'yes' : 'no'}`,
        });
        events.push({
          ruleId: rule.ruleId,
          ruleName: rule.name,
          peerId: dialog.peer.id,
          peerDisplayName: dialog.peer.displayName,
          matched: true,
          reason: evaluation.reason,
          tagApplied: resolvedTag ?? null,
          taskCreated: shouldCreateTask,
          taskDueAt: taskDueAtIso,
          priority: evaluation.priority,
        });
      }
    }

    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        matches: matchedCount,
        actions: actionCount,
        events,
      });
      return;
    }
    console.log(`Rule run complete. Matches=${matchedCount}, actions=${actionCount}.`);
    return;
  }

  if (sub === 'log') {
    const parsed = parseCommandArgs(args.slice(1), ['--limit', '-n']);
    const limit = optionValue(parsed, ['--limit', '-n'])
      ? parsePositiveInt(optionValue(parsed, ['--limit', '-n'])!, '--limit')
      : 20;
    const events = await listRuleEvents(db, { accountId, limit });
    if (events.length === 0) {
      if (ctx.config.jsonOutput) {
        printJson({ ok: true, count: 0, events: [] });
        return;
      }
      console.log('No rule events yet.');
      return;
    }
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        count: events.length,
        events: events.map((event) => ({
          ...event,
          createdAt: event.createdAt.toISOString(),
        })),
      });
      return;
    }
    for (const event of events) {
      console.log(
        `${event.createdAt.toISOString()} | rule=${event.ruleId} | peer=${event.peerId} | ${event.note}`,
      );
    }
    return;
  }

  throw new Error(`Unknown rules subcommand: ${sub}`);
}
