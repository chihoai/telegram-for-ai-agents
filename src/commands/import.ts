import { readFile } from 'node:fs/promises';
import type { AppContext } from '../app/context.js';
import { parseCommandArgs, optionValue } from '../app/cli-args.js';
import { requireDb } from '../app/db.js';
import { requireAccountId } from '../app/account.js';

interface JsonExportPayload {
  peers?: Array<Record<string, unknown>>;
  dialogs?: Array<Record<string, unknown>>;
  messages?: Array<Record<string, unknown>>;
  tags?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
  summaries?: Array<Record<string, unknown>>;
  rules?: Array<Record<string, unknown>>;
}

export async function runImport(ctx: AppContext, args: string[]): Promise<void> {
  const db = requireDb(ctx);
  const accountId = await requireAccountId(ctx);
  const parsed = parseCommandArgs(args, ['--from']);
  const fromPath = optionValue(parsed, ['--from']) ?? parsed.positionals[0];
  if (!fromPath) {
    throw new Error('Usage: tgchats import --from <path>');
  }

  const raw = await readFile(fromPath, 'utf8');
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Import file is empty.');
  }

  if (trimmed.startsWith('{')) {
    const payload = JSON.parse(trimmed) as JsonExportPayload;

    for (const row of payload.peers ?? []) {
      await db.query(
        `
INSERT INTO peers (account_id, peer_id, peer_kind, username, display_name, updated_at)
VALUES ($1, $2, $3, $4, $5, now())
ON CONFLICT (account_id, peer_id)
DO UPDATE SET
  peer_kind = excluded.peer_kind,
  username = excluded.username,
  display_name = excluded.display_name,
  updated_at = now()
`,
        [
          accountId.toString(),
          row.peer_id,
          row.peer_kind,
          row.username ?? null,
          row.display_name ?? String(row.peer_id),
        ],
      );
    }

    for (const row of payload.dialogs ?? []) {
      await db.query(
        `
INSERT INTO dialogs (
  account_id, peer_id, archived, pinned, last_message_id, last_message_at, unread_count, updated_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, now())
ON CONFLICT (account_id, peer_id)
DO UPDATE SET
  archived = excluded.archived,
  pinned = excluded.pinned,
  last_message_id = excluded.last_message_id,
  last_message_at = excluded.last_message_at,
  unread_count = excluded.unread_count,
  updated_at = now()
`,
        [
          accountId.toString(),
          row.peer_id,
          row.archived ?? false,
          row.pinned ?? false,
          row.last_message_id ?? null,
          row.last_message_at ?? null,
          row.unread_count ?? 0,
        ],
      );
    }

    for (const row of payload.messages ?? []) {
      await db.query(
        `
INSERT INTO messages (
  account_id, peer_id, message_id, sent_at, sender_peer_id, text, is_service, media_type
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (account_id, peer_id, message_id) DO NOTHING
`,
        [
          accountId.toString(),
          row.peer_id,
          row.message_id,
          row.sent_at,
          row.sender_peer_id ?? null,
          row.text ?? '',
          row.is_service ?? false,
          row.media_type ?? null,
        ],
      );
    }

    for (const row of payload.tags ?? []) {
      await db.query(
        `
INSERT INTO tags (account_id, tag)
VALUES ($1, $2)
ON CONFLICT (account_id, tag) DO NOTHING
`,
        [accountId.toString(), row.tag],
      );
      await db.query(
        `
INSERT INTO peer_tags (account_id, peer_id, tag, source, confidence)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (account_id, peer_id, tag)
DO UPDATE SET source = excluded.source, confidence = excluded.confidence
`,
        [
          accountId.toString(),
          row.peer_id,
          row.tag,
          row.source ?? 'manual',
          row.confidence ?? null,
        ],
      );
    }

    for (const row of payload.tasks ?? []) {
      await db.query(
        `
INSERT INTO tasks (account_id, peer_id, due_at, status, why, priority, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, now(), now())
`,
        [
          accountId.toString(),
          row.peer_id,
          row.due_at ?? new Date().toISOString(),
          row.status ?? 'open',
          row.why ?? '',
          row.priority ?? 'med',
        ],
      );
    }

    for (const row of payload.summaries ?? []) {
      await db.query(
        `
INSERT INTO summaries (account_id, peer_id, kind, content, source_model, updated_at)
VALUES ($1, $2, $3, $4, $5, now())
ON CONFLICT (account_id, peer_id, kind)
DO UPDATE SET content = excluded.content, source_model = excluded.source_model, updated_at = now()
`,
        [
          accountId.toString(),
          row.peer_id,
          row.kind ?? 'rolling',
          row.content ?? '',
          row.source_model ?? null,
        ],
      );
    }

    for (const row of payload.rules ?? []) {
      await db.query(
        `
INSERT INTO automation_rules (account_id, name, contains_text, set_tag, followup_days, enabled)
VALUES ($1, $2, $3, $4, $5, $6)
`,
        [
          accountId.toString(),
          row.name ?? 'imported-rule',
          row.contains_text ?? '',
          row.set_tag ?? null,
          row.followup_days ?? null,
          row.enabled ?? true,
        ],
      );
    }

    console.log(`Import complete from ${fromPath}.`);
    return;
  }

  // JSONL fallback: treats each line as a message row
  const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);
  let inserted = 0;
  for (const line of lines) {
    const row = JSON.parse(line) as Record<string, unknown>;
    await db.query(
      `
INSERT INTO messages (
  account_id, peer_id, message_id, sent_at, sender_peer_id, text, is_service, media_type
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (account_id, peer_id, message_id) DO NOTHING
`,
      [
        accountId.toString(),
        row.peer_id,
        row.message_id,
        row.sent_at ?? new Date().toISOString(),
        row.sender_peer_id ?? null,
        row.text ?? '',
        row.is_service ?? false,
        row.media_type ?? null,
      ],
    );
    inserted += 1;
  }
  console.log(`Imported ${inserted} JSONL records from ${fromPath}.`);
}

