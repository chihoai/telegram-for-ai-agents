import type { TelegramClient } from '@mtcute/node';
import type { DbPool } from '../db/pool.js';
import { createPool } from '../db/pool.js';
import { loadConfig, ensureSessionDir, type AppConfig } from './config.js';
import { createTelegramClient } from './telegram-client.js';
import type { AiService } from '../ai/service.js';
import { createAiService } from '../ai/service.js';

export interface AppContext {
  config: AppConfig;
  telegram: TelegramClient;
  db?: DbPool;
  accountId?: bigint;
  ai?: AiService;
}

export function createContext(args: string[]): AppContext {
  const config = loadConfig(args);
  ensureSessionDir(config.sessionPath);

  const telegram = createTelegramClient(config);
  const db = config.databaseUrl ? createPool(config.databaseUrl) : undefined;
  const ai = createAiService(config);

  return { config, telegram, db, ai };
}

export async function destroyContext(ctx: AppContext): Promise<void> {
  try {
    await ctx.telegram.destroy();
  } catch (error) {
    if (!ctx.config.jsonOutput) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Warning: failed to destroy Telegram client cleanly (${message}).`);
    }
  }
  if (ctx.db) {
    await ctx.db.end();
  }
}
