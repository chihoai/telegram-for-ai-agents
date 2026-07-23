import type { AppContext } from '../app/context.js';
import { ensureAuthorized, formatMessagePreview, listDialogs } from '../services/telegram.js';
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

export async function runInbox(ctx: AppContext): Promise<void> {
  await ensureAuthorized(ctx.telegram);
  const me = await ctx.telegram.getMe();

  const dialogs = await listDialogs(ctx.telegram, {
    limit: ctx.config.limit,
    all: ctx.config.all,
  });

  if (dialogs.length === 0) {
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        account: { displayName: me.displayName, id: me.id },
        count: 0,
        dialogs: [],
      });
      return;
    }
    console.log('No chats found.');
    return;
  }

  if (ctx.config.jsonOutput) {
    printJson({
      ok: true,
      account: { displayName: me.displayName, id: me.id },
      count: dialogs.length,
      dialogs: dialogs.map((dialog, index) => ({
        index: index + 1,
        peer: {
          id: dialog.peer.id,
          type: dialog.peer.type,
          displayName: dialog.peer.displayName,
          username: dialog.peer.username ?? null,
        },
        lastMessage: dialog.lastMessage
          ? {
              id: dialog.lastMessage.id,
              date: dialog.lastMessage.date.toISOString(),
              preview: formatMessagePreview(dialog.lastMessage),
            }
          : null,
      })),
    });
    return;
  }

  console.log(`Logged in as ${me.displayName}.`);
  console.log(ctx.config.all ? `\nAll chats (${dialogs.length}):` : `\nLatest ${dialogs.length} chats:`);

  for (let index = 0; index < dialogs.length; index += 1) {
    const dialog = dialogs[index];
    const message = dialog.lastMessage;
    const when = message ? formatDate(message.date) : 'N/A';
    const preview = formatMessagePreview(message);

    console.log(`${index + 1}. ${dialog.peer.displayName}`);
    console.log(`   ${when} | ${preview}`);
  }
}
