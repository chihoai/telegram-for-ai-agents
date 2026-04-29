import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AppConfig } from '../app/config.js';

export type AgentWritePreviewKind = 'outbox' | 'members.invite' | 'groups.leave';

export interface AgentWritePreviewRecord {
  previewId: string;
  kind: AgentWritePreviewKind;
  createdAt: string;
  expiresAt: string;
  payloadHash: string;
  payload: Record<string, unknown>;
  summary: Record<string, unknown>;
}

const PREVIEW_TTL_MS = 30 * 60 * 1000;

function previewDir(config: AppConfig) {
  return join(dirname(config.sessionPath), 'agent-write-previews');
}

function runDir(config: AppConfig) {
  return join(dirname(config.sessionPath), 'agent-write-runs');
}

function previewPath(config: AppConfig, previewId: string) {
  return join(previewDir(config), `${previewId}.json`);
}

function runPath(config: AppConfig, runKey: string) {
  return join(runDir(config), `${createPayloadHash(runKey)}.json`);
}

export function createPayloadHash(payload: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

export async function saveAgentWritePreview(
  config: AppConfig,
  input: {
    kind: AgentWritePreviewKind;
    payload: Record<string, unknown>;
    summary: Record<string, unknown>;
  },
) {
  const now = new Date();
  const record: AgentWritePreviewRecord = {
    previewId: `${input.kind}:${randomUUID()}`,
    kind: input.kind,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PREVIEW_TTL_MS).toISOString(),
    payloadHash: createPayloadHash(input.payload),
    payload: input.payload,
    summary: input.summary,
  };

  await mkdir(previewDir(config), { recursive: true });
  await writeFile(previewPath(config, record.previewId), JSON.stringify(record, null, 2));
  return record;
}

export async function loadAgentWritePreview(
  config: AppConfig,
  previewId: string,
  expectedKind: AgentWritePreviewKind,
) {
  const raw = await readFile(previewPath(config, previewId), 'utf8').catch(() => null);
  if (!raw) {
    throw new Error(`Preview not found: ${previewId}`);
  }

  const record = JSON.parse(raw) as AgentWritePreviewRecord;
  if (record.kind !== expectedKind) {
    throw new Error(`Preview ${previewId} is not a ${expectedKind} preview.`);
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    throw new Error(`Preview expired: ${previewId}`);
  }

  return record;
}

export function createAgentWriteRunKey(input: {
  toolName: string;
  previewId: string;
  idempotencyKey?: string | null;
}) {
  return `${input.toolName}:${input.previewId}:${input.idempotencyKey || 'default'}`;
}

export async function loadAgentWriteRun(config: AppConfig, runKey: string) {
  const raw = await readFile(runPath(config, runKey), 'utf8').catch(() => null);
  return raw ? JSON.parse(raw) : null;
}

export async function saveAgentWriteRun(
  config: AppConfig,
  runKey: string,
  payload: Record<string, unknown>,
) {
  await mkdir(runDir(config), { recursive: true });
  const record = {
    ...payload,
    runKeyHash: createPayloadHash(runKey),
    storedAt: new Date().toISOString(),
  };
  await writeFile(runPath(config, runKey), JSON.stringify(record, null, 2));
  return record;
}
