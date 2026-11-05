import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AppConfig } from '../app/config.js';
import {
  completeAgentWritePreview,
  loadAgentWritePreview,
  saveAgentWritePreview,
} from './agentWritePreviewStore.js';

const cleanup: string[] = [];

function config(root: string, accountLabel = 'default') {
  return {
    sessionPath: join(root, 'telegram.session'),
    accountLabel,
  } as AppConfig;
}

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('agent write preview bindings', () => {
  it('binds previews to the local resource, credential, account, and payload hash', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tg-preview-'));
    cleanup.push(root);
    const record = await saveAgentWritePreview(config(root), {
      kind: 'message.action',
      payload: { action: 'delete', peer: '123', messageId: 7 },
      summary: { risk: 'delete message' },
    });

    expect(record).toMatchObject({
      resourceProfile: 'local-telegram-client',
      credentialId: 'local-session',
      accountId: 'default',
      status: 'pending',
    });
    await expect(
      loadAgentWritePreview(config(root, 'other'), record.previewId, 'message.action'),
    ).rejects.toThrow(/another Telegram account/);

    const recordPath = join(root, 'agent-write-previews', `${record.previewId}.json`);
    const tampered = JSON.parse(await readFile(recordPath, 'utf8'));
    tampered.payload.messageId = 8;
    await writeFile(recordPath, JSON.stringify(tampered));
    await expect(
      loadAgentWritePreview(config(root), record.previewId, 'message.action'),
    ).rejects.toThrow(/integrity check/);
  });

  it('rejects preview IDs that are not generated store IDs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tg-preview-'));
    cleanup.push(root);
    const forged = {
      previewId: 'outbox:forged',
      kind: 'message.action',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      resourceProfile: 'local-telegram-client',
      accountId: 'default',
      credentialId: 'local-session',
      status: 'pending',
      payload: { action: 'delete', peer: '123', messageId: 7 },
      summary: {},
    };
    await mkdir(join(root, 'workspace'), { recursive: true });
    await writeFile(join(root, 'workspace', 'notes.json'), JSON.stringify(forged));

    for (const previewId of ['../workspace/notes', 'message.action:../../workspace/notes', 'message.action:x']) {
      await expect(
        loadAgentWritePreview(config(root), previewId, 'message.action'),
      ).rejects.toThrow(/Preview ID is invalid/);
    }
  });

  it('rejects a stored record copied under another preview ID', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tg-preview-'));
    cleanup.push(root);
    const record = await saveAgentWritePreview(config(root), {
      kind: 'message.action',
      payload: { action: 'delete', peer: '123', messageId: 7 },
      summary: { risk: 'delete message' },
    });
    const otherId = 'message.action:00000000-0000-4000-8000-000000000000';
    const previews = join(root, 'agent-write-previews');
    await writeFile(
      join(previews, `${otherId}.json`),
      await readFile(join(previews, `${record.previewId}.json`), 'utf8'),
    );

    await expect(
      loadAgentWritePreview(config(root), otherId, 'message.action'),
    ).rejects.toThrow(/integrity check/);
  });

  it.skipIf(process.platform === 'win32')('keeps preview records private to the owner', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tg-preview-'));
    cleanup.push(root);
    const record = await saveAgentWritePreview(config(root), {
      kind: 'outbox',
      payload: { peers: ['123'], text: 'secret' },
      summary: {},
    });
    const previews = join(root, 'agent-write-previews');

    expect((await stat(previews)).mode & 0o777).toBe(0o700);
    expect((await stat(join(previews, `${record.previewId}.json`))).mode & 0o777).toBe(0o600);
  });

  it('cannot execute a completed preview again under a different idempotency key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tg-preview-'));
    cleanup.push(root);
    const record = await saveAgentWritePreview(config(root), {
      kind: 'media.send',
      payload: { peer: '123', uploadRef: 'upload' },
      summary: { risk: 'send media' },
    });
    await completeAgentWritePreview(config(root), record);
    await expect(
      loadAgentWritePreview(config(root), record.previewId, 'media.send'),
    ).rejects.toThrow(/already completed/);
  });
});
