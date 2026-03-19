import type { AppContext } from '../app/context.js';
import { ensureAuthorized } from '../services/telegram.js';

export async function runArchive(ctx: AppContext, args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error('Usage: tgchats archive <peer...>');
  }
  await ensureAuthorized(ctx.telegram);
  await ctx.telegram.archiveChats(args);
  console.log(`Archived ${args.length} chat(s).`);
}

export async function runUnarchive(ctx: AppContext, args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error('Usage: tgchats unarchive <peer...>');
  }
  await ensureAuthorized(ctx.telegram);
  await ctx.telegram.unarchiveChats(args);
  console.log(`Unarchived ${args.length} chat(s).`);
}

