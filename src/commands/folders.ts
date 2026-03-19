import type { AppContext } from '../app/context.js';
import { parseCommandArgs, optionValue } from '../app/cli-args.js';
import {
  ensureAuthorized,
  folderTitle,
  listEditableFolders,
  normalizePeerRef,
  resolveFolderByRef,
  toTextWithEntities,
  uniqueInputPeers,
} from '../services/telegram.js';
import { tl } from '@mtcute/node';
import { printJson } from '../output.js';

function inputPeerKey(peer: tl.TypeInputPeer): string {
  return JSON.stringify(peer);
}

function printFolder(folder: tl.RawDialogFilter): void {
  console.log(
    `${folder.id} | ${folderTitle(folder)} | include=${folder.includePeers.length} exclude=${folder.excludePeers.length}`,
  );
}

export async function runFolders(ctx: AppContext, args: string[]): Promise<void> {
  const sub = args[0];
  if (!sub) {
    throw new Error(
      'Usage: tgchats folders <list|create|rename|delete|order|add|remove> ...',
    );
  }

  await ensureAuthorized(ctx.telegram);

  if (sub === 'list') {
    const folders = await listEditableFolders(ctx.telegram);
    if (folders.length === 0) {
      if (ctx.config.jsonOutput) {
        printJson({ ok: true, count: 0, folders: [] });
        return;
      }
      console.log('No folders found.');
      return;
    }
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        count: folders.length,
        folders: folders.map((folder) => ({
          id: folder.id,
          title: folderTitle(folder),
          includePeersCount: folder.includePeers.length,
          excludePeersCount: folder.excludePeers.length,
        })),
      });
      return;
    }
    folders.forEach(printFolder);
    return;
  }

  if (sub === 'create') {
    const parsed = parseCommandArgs(args.slice(1), ['--title']);
    const title = optionValue(parsed, ['--title']);
    if (!title) {
      throw new Error('Usage: tgchats folders create --title "Leads"');
    }
    const created = await ctx.telegram.createFolder({
      title: toTextWithEntities(title),
      pinnedPeers: [],
      includePeers: [],
      excludePeers: [],
    });
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        action: 'create',
        folder: {
          id: created.id,
          title: created.title.text,
        },
      });
      return;
    }
    console.log(`Created folder ${created.id}: ${created.title.text}`);
    return;
  }

  if (sub === 'rename') {
    const parsed = parseCommandArgs(args.slice(1), ['--title']);
    const folderRef = parsed.positionals[0];
    const title = optionValue(parsed, ['--title']);
    if (!folderRef || !title) {
      throw new Error('Usage: tgchats folders rename <id|title> --title "Customers"');
    }
    await ctx.telegram.editFolder({
      folder: folderRef,
      modification: { title: toTextWithEntities(title) },
    });
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        action: 'rename',
        folder: {
          ref: folderRef,
          title,
        },
      });
      return;
    }
    console.log('Folder renamed.');
    return;
  }

  if (sub === 'delete') {
    const folderRef = args[1];
    if (!folderRef) {
      throw new Error('Usage: tgchats folders delete <id|title>');
    }
    const folder = await resolveFolderByRef(ctx.telegram, folderRef);
    await ctx.telegram.deleteFolder(folder.id);
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        action: 'delete',
        folder: {
          id: folder.id,
          title: folderTitle(folder),
        },
      });
      return;
    }
    console.log(`Deleted folder ${folder.id}: ${folderTitle(folder)}.`);
    return;
  }

  if (sub === 'order') {
    const ids = args
      .slice(1)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value));
    if (ids.length === 0) {
      throw new Error('Usage: tgchats folders order <id...>');
    }
    await ctx.telegram.setFoldersOrder(ids);
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        action: 'order',
        folderIds: ids,
      });
      return;
    }
    console.log(`Applied folder order: ${ids.join(', ')}.`);
    return;
  }

  if (sub === 'add' || sub === 'remove') {
    const folderRef = args[1];
    const peerInputs = args.slice(2);
    if (!folderRef || peerInputs.length === 0) {
      throw new Error(`Usage: tgchats folders ${sub} <id|title> <peer...>`);
    }

    const folder = await resolveFolderByRef(ctx.telegram, folderRef);
    const resolvedPeers = await Promise.all(
      peerInputs.map(async (peerInput) => ctx.telegram.resolvePeer(normalizePeerRef(peerInput))),
    );

    const current = folder.includePeers ?? [];
    let next = current;
    if (sub === 'add') {
      next = uniqueInputPeers([...current, ...resolvedPeers]);
    } else {
      const removeSet = new Set(resolvedPeers.map(inputPeerKey));
      next = current.filter((peer) => !removeSet.has(inputPeerKey(peer)));
    }

    await ctx.telegram.editFolder({
      folder: folder.id,
      modification: { includePeers: next },
    });
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        action: sub,
        folder: {
          id: folder.id,
          title: folderTitle(folder),
        },
        includePeersCount: next.length,
      });
      return;
    }
    console.log(`Folder ${sub} complete. includePeers=${next.length}`);
    return;
  }

  throw new Error(`Unknown folders subcommand: ${sub}`);
}
