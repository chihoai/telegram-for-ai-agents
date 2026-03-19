import type { AppContext } from '../app/context.js';
import { requireDb } from '../app/db.js';
import { normalizePeerRef, ensureAuthorized, fetchChatHistory } from './telegram.js';
import {
  countOutboundMessagesForRunPeer,
  listRecentOutboundMessages,
  recordOutboundMessage,
} from '../db/flows.js';
import { evaluateSendGuardrails, latestMessageId } from '../flows/guardrails.js';

export interface GuardedSendResult {
  ok: boolean;
  sent: boolean;
  blocked: boolean;
  dryRun: boolean;
  peerId: number;
  peerDisplayName: string;
  text: string;
  telegramMessageId: number | null;
  expectedLastMessageId: number | null;
  observedLastMessageId: number | null;
  failures: string[];
  verification: Record<string, unknown>;
}

export async function sendGuardedMessage(
  ctx: AppContext,
  params: {
    accountId: bigint;
    peerRef: string | number;
    text: string;
    reason: string;
    expectedLastMessageId?: number;
    maxInactiveDays: number;
    dedupeWindowDays: number;
    runId?: number | null;
    dryRun?: boolean;
  },
): Promise<GuardedSendResult> {
  const db = requireDb(ctx);
  await ensureAuthorized(ctx.telegram);

  const peer = await ctx.telegram.getPeer(normalizePeerRef(params.peerRef));
  const me = await ctx.telegram.getMe();
  const history = await fetchChatHistory(ctx.telegram, {
    chatId: String(peer.id),
    limit: 20,
  });
  const recentLogged = await listRecentOutboundMessages(db, {
    accountId: params.accountId,
    peerId: peer.id,
    limit: 20,
  });
  const priorRunPeerSendCount = params.runId
    ? await countOutboundMessagesForRunPeer(db, {
        runId: params.runId,
        peerId: peer.id,
      })
    : 0;

  const guardrails = evaluateSendGuardrails({
    history: history.map((message) => ({
      id: message.id,
      date: message.date,
      senderId: message.sender.id,
      text: message.text,
    })),
    now: new Date(),
    meId: me.id,
    expectedLastMessageId: params.expectedLastMessageId,
    maxInactiveDays: params.maxInactiveDays,
    dedupeWindowDays: params.dedupeWindowDays,
    text: params.text,
    recentLoggedTexts: recentLogged.map((row) => row.text),
    priorRunPeerSendCount,
  });

  const observedLastMessageId = latestMessageId(
    history.map((message) => ({
      id: message.id,
      date: message.date,
    })),
  );

  if (!guardrails.ok) {
    const verification = {
      failures: guardrails.failures,
      observedLastMessageId,
    };
    await recordOutboundMessage(db, {
      accountId: params.accountId,
      runId: params.runId ?? null,
      peerId: peer.id,
      text: params.text,
      status: 'blocked',
      reason: params.reason,
      expectedLastMessageId: params.expectedLastMessageId ?? null,
      observedLastMessageId,
      verification,
    });
    return {
      ok: false,
      sent: false,
      blocked: true,
      dryRun: Boolean(params.dryRun),
      peerId: peer.id,
      peerDisplayName: peer.displayName,
      text: params.text,
      telegramMessageId: null,
      expectedLastMessageId: params.expectedLastMessageId ?? null,
      observedLastMessageId,
      failures: guardrails.failures,
      verification,
    };
  }

  if (params.dryRun) {
    const verification = {
      dryRun: true,
      observedLastMessageId,
    };
    await recordOutboundMessage(db, {
      accountId: params.accountId,
      runId: params.runId ?? null,
      peerId: peer.id,
      text: params.text,
      status: 'planned',
      reason: params.reason,
      expectedLastMessageId: params.expectedLastMessageId ?? null,
      observedLastMessageId,
      verification,
    });
    return {
      ok: true,
      sent: false,
      blocked: false,
      dryRun: true,
      peerId: peer.id,
      peerDisplayName: peer.displayName,
      text: params.text,
      telegramMessageId: null,
      expectedLastMessageId: params.expectedLastMessageId ?? null,
      observedLastMessageId,
      failures: [],
      verification,
    };
  }

  const sentMessage = await ctx.telegram.sendText(peer.id, params.text);
  const postHistory = await fetchChatHistory(ctx.telegram, {
    chatId: String(peer.id),
    limit: 10,
  });
  const verification = {
    sentMessageId: sentMessage.id,
    echoedInHistory: postHistory.some((message) => message.id === sentMessage.id),
    observedLastMessageId: latestMessageId(
      postHistory.map((message) => ({
        id: message.id,
        date: message.date,
      })),
    ),
  };

  await recordOutboundMessage(db, {
    accountId: params.accountId,
    runId: params.runId ?? null,
    peerId: peer.id,
    telegramMessageId: sentMessage.id,
    text: params.text,
    status: 'sent',
    reason: params.reason,
    expectedLastMessageId: params.expectedLastMessageId ?? null,
    observedLastMessageId: Number(verification.observedLastMessageId ?? 0) || null,
    verification,
  });

  return {
    ok: true,
    sent: true,
    blocked: false,
    dryRun: false,
    peerId: peer.id,
    peerDisplayName: peer.displayName,
    text: params.text,
    telegramMessageId: sentMessage.id,
    expectedLastMessageId: params.expectedLastMessageId ?? null,
    observedLastMessageId: Number(verification.observedLastMessageId ?? 0) || null,
    failures: [],
    verification,
  };
}
