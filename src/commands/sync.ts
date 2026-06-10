import type { AppContext } from '../app/context.js';
import { parseCommandArgs, optionValue, parsePositiveInt } from '../app/cli-args.js';
import { requireDb } from '../app/db.js';
import { requireAccountId } from '../app/account.js';
import {
  ensureAuthorized,
  fetchChatHistory,
  listDialogs,
  withTelegramRateLimitBackoff,
  type TelegramBackoffEvent,
} from '../services/telegram.js';
import { getSyncCursor, updateSyncCursor } from '../db/crm.js';
import { insertMessage, upsertDialog, upsertPeer } from '../db/writes.js';
import { printJson } from '../output.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffEventPayload(event: TelegramBackoffEvent) {
  return {
    operation: event.operation,
    attempt: event.attempt,
    code: event.code,
    retryAfterMs: event.waitMs,
  };
}

async function syncOnce(ctx: AppContext, dialogLimit: number): Promise<number> {
  const db = requireDb(ctx);
  const accountId = await requireAccountId(ctx);
  const dialogs = await listDialogs(ctx.telegram, { all: false, limit: dialogLimit });

  let messagesProcessed = 0;
  for (const dialog of dialogs) {
    await upsertPeer(db, { accountId, peer: dialog.peer });
    await upsertDialog(db, { accountId, dialog });

    const cursor = await getSyncCursor(db, { accountId, peerId: dialog.peer.id });
    const lastSyncedMessageId = cursor?.lastSyncedMessageId ?? null;

    if (lastSyncedMessageId) {
      const messages = await fetchChatHistory(ctx.telegram, {
        chatId: String(dialog.peer.id),
        limit: Number.POSITIVE_INFINITY,
        sinceMessageId: lastSyncedMessageId,
      });

      for (const message of messages) {
        await insertMessage(db, { accountId, peer: dialog.peer, message });
        messagesProcessed += 1;
      }

      if (messages.length > 0) {
        await updateSyncCursor(db, {
          accountId,
          peerId: dialog.peer.id,
          lastSyncedMessageId: Math.max(...messages.map((message) => message.id)),
        });
      }
      continue;
    }

    const lastMessage = dialog.lastMessage;
    if (lastMessage) {
      await insertMessage(db, { accountId, peer: dialog.peer, message: lastMessage });
      await updateSyncCursor(db, {
        accountId,
        peerId: dialog.peer.id,
        lastSyncedMessageId: lastMessage.id,
      });
      messagesProcessed += 1;
    }
  }
  return messagesProcessed;
}

export async function runSync(ctx: AppContext, args: string[]): Promise<void> {
  requireDb(ctx);
  const sub = args[0];
  if (!sub) {
    throw new Error('Usage: tgchats sync <backfill|once|tail> ...');
  }

  await ensureAuthorized(ctx.telegram);

  if (sub === 'backfill') {
    const parsed = parseCommandArgs(args.slice(1), ['--per-chat-limit', '--dialogs']);
    const perChatLimit = optionValue(parsed, ['--per-chat-limit'])
      ? parsePositiveInt(optionValue(parsed, ['--per-chat-limit'])!, '--per-chat-limit')
      : 100;
    const dialogsLimit = optionValue(parsed, ['--dialogs'])
      ? parsePositiveInt(optionValue(parsed, ['--dialogs'])!, '--dialogs')
      : 200;

    const db = requireDb(ctx);
    const accountId = await requireAccountId(ctx);
    const backoffs: TelegramBackoffEvent[] = [];
    const selectedResult = await withTelegramRateLimitBackoff(
      'sync.backfill.dialogs',
      () => listDialogs(ctx.telegram, {
        all: false,
        includeArchived: true,
        limit: dialogsLimit,
      }),
      {
        onBackoff: (event) => {
          if (!ctx.config.jsonOutput) {
            console.error(
              `Telegram rate limit while listing dialogs; retrying in ${Math.ceil(event.waitMs / 1000)}s (${event.code}).`,
            );
          }
        },
      },
    );

    if (!selectedResult.ok) {
      if (ctx.config.jsonOutput) {
        printJson({
          ok: false,
          mode: 'backfill',
          code: 'TELEGRAM_RATE_LIMIT',
          error: 'Telegram rate limit while listing dialogs.',
          retryAfterMs: selectedResult.retryAfterMs,
          telegramCode: selectedResult.code,
          rateLimitBackoffs: selectedResult.backoffs.map(backoffEventPayload),
        });
        return;
      }
      console.error(
        `Telegram rate limit while listing dialogs; retry after ${Math.ceil(selectedResult.retryAfterMs / 1000)}s (${selectedResult.code}).`,
      );
      return;
    }

    const selected = selectedResult.value;
    backoffs.push(...selectedResult.backoffs);
    const skippedDialogs: Array<{
      peerId: number;
      displayName: string;
      code: string;
      retryAfterMs: number;
    }> = [];

    let insertedMessages = 0;
    for (const dialog of selected) {
      await upsertPeer(db, { accountId, peer: dialog.peer });
      await upsertDialog(db, { accountId, dialog });

      const historyResult = await withTelegramRateLimitBackoff(
        `sync.backfill.history:${dialog.peer.id}`,
        () => fetchChatHistory(ctx.telegram, {
          chatId: String(dialog.peer.id),
          limit: perChatLimit,
        }),
        {
          onBackoff: (event) => {
            if (!ctx.config.jsonOutput) {
              console.error(
                `Telegram rate limit while backfilling ${dialog.peer.displayName}; retrying in ${Math.ceil(event.waitMs / 1000)}s (${event.code}).`,
              );
            }
          },
        },
      );

      backoffs.push(...historyResult.backoffs);
      if (!historyResult.ok) {
        skippedDialogs.push({
          peerId: dialog.peer.id,
          displayName: dialog.peer.displayName,
          code: historyResult.code,
          retryAfterMs: historyResult.retryAfterMs,
        });
        if (!ctx.config.jsonOutput) {
          console.error(
            `Skipped ${dialog.peer.displayName} after Telegram rate limit; retry after ${Math.ceil(historyResult.retryAfterMs / 1000)}s (${historyResult.code}).`,
          );
        }
        continue;
      }

      const messages = historyResult.value;
      for (const message of messages) {
        await insertMessage(db, { accountId, peer: dialog.peer, message });
        insertedMessages += 1;
      }

      await updateSyncCursor(db, {
        accountId,
        peerId: dialog.peer.id,
        lastSyncedMessageId: messages[0]?.id,
      });
      if (!ctx.config.jsonOutput) {
        console.log(`Backfilled ${dialog.peer.displayName}: ${messages.length} messages`);
      }
    }

    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        mode: 'backfill',
        partial: skippedDialogs.length > 0,
        dialogs: selected.length,
        skippedDialogs,
        messagesProcessed: insertedMessages,
        rateLimitBackoffs: backoffs.map(backoffEventPayload),
      });
      return;
    }
    console.log(
      `Backfill complete. Dialogs=${selected.length}, messages processed=${insertedMessages}.`,
    );
    return;
  }

  if (sub === 'once') {
    const parsed = parseCommandArgs(args.slice(1), ['--dialogs']);
    const dialogsLimit = optionValue(parsed, ['--dialogs'])
      ? parsePositiveInt(optionValue(parsed, ['--dialogs'])!, '--dialogs')
      : 200;
    const writes = await syncOnce(ctx, dialogsLimit);
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        mode: 'once',
        writes,
      });
      return;
    }
    console.log(`Sync once complete. Updated ${writes} latest messages.`);
    return;
  }

  if (sub === 'tail') {
    const parsed = parseCommandArgs(args.slice(1), ['--interval-seconds', '--dialogs']);
    const intervalSeconds = optionValue(parsed, ['--interval-seconds'])
      ? parsePositiveInt(optionValue(parsed, ['--interval-seconds'])!, '--interval-seconds')
      : 60;
    const dialogsLimit = optionValue(parsed, ['--dialogs'])
      ? parsePositiveInt(optionValue(parsed, ['--dialogs'])!, '--dialogs')
      : 200;

    console.log(
      `Starting sync tail loop (interval=${intervalSeconds}s, dialogs=${dialogsLimit}). Press Ctrl+C to stop.`,
    );

    while (true) {
      const writes = await syncOnce(ctx, dialogsLimit);
      console.log(`${new Date().toISOString()} | tail sync wrote ${writes} messages`);
      await sleep(intervalSeconds * 1000);
    }
  }

  throw new Error(`Unknown sync subcommand: ${sub}`);
}
