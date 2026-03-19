import type { AppContext } from '../app/context.js';
import { parseCommandArgs, optionValue, parsePositiveInt } from '../app/cli-args.js';
import {
  ensureAuthorized,
  fetchChatHistory,
  formatMessagePreview,
  normalizePeerRef,
} from '../services/telegram.js';
import { requireAccountId } from '../app/account.js';
import { insertMessage, upsertPeer } from '../db/writes.js';
import { printJson } from '../output.js';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export async function runChat(ctx: AppContext, args: string[]): Promise<void> {
  const parsed = parseCommandArgs(args, ['--limit', '-n', '--since']);
  const peerArg = parsed.positionals[0];
  if (!peerArg) {
    throw new Error('Usage: tgchats chat <peer> [--limit N] [--since messageId]');
  }

  const limit = optionValue(parsed, ['--limit', '-n'])
    ? parsePositiveInt(optionValue(parsed, ['--limit', '-n'])!, '--limit')
    : 50;
  const sinceRaw = optionValue(parsed, ['--since']);
  let sinceMessageId: number | undefined;
  if (sinceRaw) {
    const parsedSince = Number.parseInt(sinceRaw, 10);
    if (!Number.isInteger(parsedSince) || parsedSince < 1) {
      throw new Error('--since must be a positive message id.');
    }
    sinceMessageId = parsedSince;
  }

  await ensureAuthorized(ctx.telegram);
  const peer = await ctx.telegram.getPeer(normalizePeerRef(peerArg));
  const messages = await fetchChatHistory(ctx.telegram, {
    chatId: normalizePeerRef(peerArg),
    limit,
    sinceMessageId,
  });

  if (messages.length === 0) {
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        peer: {
          id: peer.id,
          type: peer.type,
          displayName: peer.displayName,
          username: peer.username ?? null,
        },
        count: 0,
        messages: [],
      });
      return;
    }
    console.log('No messages found.');
    return;
  }

  if (ctx.db) {
    const accountId = await requireAccountId(ctx);
    await upsertPeer(ctx.db, { accountId, peer });
    for (const message of messages) {
      await insertMessage(ctx.db, { accountId, peer, message });
    }
  }

  if (ctx.config.jsonOutput) {
    const chronological = messages.slice().reverse();
    printJson({
      ok: true,
      peer: {
        id: peer.id,
        type: peer.type,
        displayName: peer.displayName,
        username: peer.username ?? null,
      },
      count: chronological.length,
      messages: chronological.map((message) => ({
        id: message.id,
        date: message.date.toISOString(),
        sender: {
          id: message.sender.id,
          displayName: message.sender.displayName,
          username: message.sender.username ?? null,
        },
        preview: formatMessagePreview(message),
        text: message.text,
      })),
    });
    return;
  }

  console.log(`Chat: ${peer.displayName} (${peer.id})`);
  for (const message of messages.reverse()) {
    console.log(`${formatDate(message.date)} | ${formatMessagePreview(message)}`);
  }
}
