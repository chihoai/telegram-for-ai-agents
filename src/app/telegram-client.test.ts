import { describe, expect, it, vi } from 'vitest';
import { CliError } from './errors.js';
import { probeTelegramSessionStorage } from './telegram-client.js';

describe('probeTelegramSessionStorage', () => {
  it('uses WAL mode when SQLite allows it', () => {
    const pragma = vi.fn();
    const close = vi.fn();

    expect(
      probeTelegramSessionStorage('/tmp/test.session', () => ({
        pragma,
        close,
      }) as any),
    ).toEqual({ disableWal: false });
    expect(pragma).toHaveBeenCalledWith('journal_mode = WAL');
    expect(close).toHaveBeenCalled();
  });

  it('falls back cleanly when WAL init cannot open sidecar files', () => {
    const close = vi.fn();

    expect(
      probeTelegramSessionStorage('/tmp/test.session', () => ({
        pragma: () => {
          throw Object.assign(new Error('unable to open database file'), {
            code: 'SQLITE_CANTOPEN',
          });
        },
        close,
      }) as any),
    ).toEqual({
      disableWal: true,
      warning:
        'Telegram session storage does not support SQLite WAL here; falling back to compatibility mode.',
    });
    expect(close).toHaveBeenCalled();
  });

  it('throws a stable CLI error when the session database itself cannot open', () => {
    expect(() =>
      probeTelegramSessionStorage('/tmp/test.session', () => {
        throw Object.assign(new Error('unable to open database file'), {
          code: 'SQLITE_CANTOPEN',
        });
      }),
    ).toThrowError(CliError);

    try {
      probeTelegramSessionStorage('/tmp/test.session', () => {
        throw Object.assign(new Error('unable to open database file'), {
          code: 'SQLITE_CANTOPEN',
        });
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: 'TELEGRAM_SESSION_STORAGE_OPEN_FAILED',
      });
    }
  });
});
