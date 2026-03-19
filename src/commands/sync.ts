import type { AppContext } from '../app/context.js';
import { parseCommandArgs, optionValue, parsePositiveInt } from '../app/cli-args.js';
import { requireDb } from '../app/db.js';
import { requireAccountId } from '../app/account.js';
import { ensureAuthorized, fetchChatHistory, listDialogs } from '../services/telegram.js';
import { updateSyncCursor } from '../db/crm.js';
import { insertMessage, upsertDialog, upsertPeer } from '../db/writes.js';
import { printJson } from '../output.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncOnce(ctx: AppContext, dialogLimit: number): Promise<number> {
  const db = requireDb(ctx);
  const accountId = await requireAccountId(ctx);
  const dialogs = await listDialogs(ctx.telegram, { all: false, limit: dialogLimit });

  let writes = 0;
  for (const dialog of dialogs) {
    await upsertPeer(db, { accountId, peer: dialog.peer });
    await upsertDialog(db, { accountId, dialog });
    const message = dialog.lastMessage;
    if (message) {
      await insertMessage(db, { accountId, peer: dialog.peer, message });
      await updateSyncCursor(db, {
        accountId,
        peerId: dialog.peer.id,
        lastSyncedMessageId: message.id,
      });
      writes += 1;
    }
  }
  return writes;
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
    const dialogs = await listDialogs(ctx.telegram, { all: true, limit: dialogsLimit });
    const selected = dialogsLimit > 0 ? dialogs.slice(0, dialogsLimit) : dialogs;

    let insertedMessages = 0;
    for (const dialog of selected) {
      await upsertPeer(db, { accountId, peer: dialog.peer });
      await upsertDialog(db, { accountId, dialog });

      const messages = await fetchChatHistory(ctx.telegram, {
        chatId: String(dialog.peer.id),
        limit: perChatLimit,
      });
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
        dialogs: selected.length,
        messagesProcessed: insertedMessages,
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
