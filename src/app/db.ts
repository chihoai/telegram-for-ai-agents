import type { AppContext } from './context.js';
import type { DbPool } from '../db/pool.js';

export function requireDb(ctx: AppContext): DbPool {
  if (!ctx.db) {
    throw new Error('DATABASE_URL is not set.');
  }
  return ctx.db;
}

