import type { AppContext } from './context.js';
import { ensureAccountId } from '../db/crm.js';

export async function requireAccountId(ctx: AppContext): Promise<bigint> {
  if (!ctx.db) {
    throw new Error('DATABASE_URL is not set.');
  }

  if (!ctx.accountId) {
    ctx.accountId = await ensureAccountId(ctx.db, {
      label: ctx.config.accountLabel,
      sessionPath: ctx.config.sessionPath,
    });
  }

  return ctx.accountId;
}

