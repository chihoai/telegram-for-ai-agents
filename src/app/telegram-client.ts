import { TelegramClient } from '@mtcute/node';
import { createProxyTransport } from '../proxy.js';
import type { AppConfig } from './config.js';

export function createTelegramClient(config: AppConfig): TelegramClient {
  const transport = createProxyTransport(config.proxyUrl);
  if (transport) {
    console.log('Using proxy transport from TELEGRAM_PROXY_URL.');
  }

  return new TelegramClient({
    apiId: config.apiId,
    apiHash: config.apiHash,
    storage: config.sessionPath,
    ...(transport ? { transport } : {}),
  });
}

