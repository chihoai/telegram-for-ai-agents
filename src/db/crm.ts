import type { DbPool } from './pool.js';
import { upsertAccount } from './writes.js';

export async function ensureAccountId(
  pool: DbPool,
  params: { label: string; sessionPath: string },
): Promise<bigint> {
  return upsertAccount(pool, params);
}

export async function setPeerTags(
  pool: DbPool,
  params: {
    accountId: bigint;
    peerId: number;
    tags: string[];
    source: 'manual' | 'ai' | 'rule';
  },
): Promise<void> {
  for (const rawTag of params.tags) {
    const tag = rawTag.trim();
    if (!tag) continue;
    await pool.query(
      `
INSERT INTO tags (account_id, tag)
VALUES ($1, $2)
ON CONFLICT (account_id, tag) DO NOTHING
`,
      [params.accountId.toString(), tag],
    );

    await pool.query(
      `
INSERT INTO peer_tags (account_id, peer_id, tag, source)
VALUES ($1, $2, $3, $4)
ON CONFLICT (account_id, peer_id, tag)
DO UPDATE SET source = excluded.source
`,
      [params.accountId.toString(), params.peerId, tag, params.source],
    );
  }
}

export async function listPeerTags(
  pool: DbPool,
  params: { accountId: bigint; peerId?: number },
): Promise<Array<{ peerId: number; tag: string; source: string }>> {
  const query = params.peerId
    ? `
SELECT peer_id as "peerId", tag, source
FROM peer_tags
WHERE account_id = $1 AND peer_id = $2
ORDER BY tag ASC
`
    : `
SELECT peer_id as "peerId", tag, source
FROM peer_tags
WHERE account_id = $1
ORDER BY peer_id ASC, tag ASC
`;
  const values = params.peerId
    ? [params.accountId.toString(), params.peerId]
    : [params.accountId.toString()];
  const result = await pool.query<{ peerId: number; tag: string; source: string }>(query, values);
  return result.rows;
}

export async function linkPeerCompany(
  pool: DbPool,
  params: {
    accountId: bigint;
    peerId: number;
    companyName: string;
    role?: string;
    source: 'manual' | 'ai' | 'rule';
  },
): Promise<void> {
  const companyResult = await pool.query<{ company_id: string }>(
    `
INSERT INTO companies (account_id, name)
VALUES ($1, $2)
ON CONFLICT (account_id, name)
DO UPDATE SET name = excluded.name
RETURNING company_id
`,
    [params.accountId.toString(), params.companyName.trim()],
  );

  const companyId = companyResult.rows[0].company_id;
  await pool.query(
    `
INSERT INTO peer_company (account_id, peer_id, company_id, role, source, updated_at)
VALUES ($1, $2, $3, $4, $5, now())
ON CONFLICT (account_id, peer_id)
DO UPDATE SET
  company_id = excluded.company_id,
  role = excluded.role,
  source = excluded.source,
  updated_at = now()
`,
    [params.accountId.toString(), params.peerId, companyId, params.role ?? null, params.source],
  );
}

export async function getPeerCompany(
  pool: DbPool,
  params: { accountId: bigint; peerId: number },
): Promise<{ companyName: string; role: string | null } | null> {
  const result = await pool.query<{ companyName: string; role: string | null }>(
    `
SELECT c.name as "companyName", pc.role
FROM peer_company pc
JOIN companies c ON c.company_id = pc.company_id
WHERE pc.account_id = $1 AND pc.peer_id = $2
LIMIT 1
`,
    [params.accountId.toString(), params.peerId],
  );
  return result.rows[0] ?? null;
}

export async function addTask(
  pool: DbPool,
  params: {
    accountId: bigint;
    peerId: number;
    dueAt: Date;
    why: string;
    priority: 'low' | 'med' | 'high';
  },
): Promise<number> {
  const result = await pool.query<{ task_id: number }>(
    `
INSERT INTO tasks (account_id, peer_id, due_at, why, priority)
VALUES ($1, $2, $3, $4, $5)
RETURNING task_id
`,
    [params.accountId.toString(), params.peerId, params.dueAt, params.why, params.priority],
  );
  return result.rows[0].task_id;
}

export async function markTaskDone(
  pool: DbPool,
  params: { accountId: bigint; taskId: number },
): Promise<boolean> {
  const result = await pool.query(
    `
UPDATE tasks
SET status = 'done', updated_at = now()
WHERE account_id = $1 AND task_id = $2
`,
    [params.accountId.toString(), params.taskId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listTasksToday(
  pool: DbPool,
  params: { accountId: bigint },
): Promise<Array<{
  taskId: number;
  peerId: number;
  dueAt: Date;
  status: string;
  why: string;
  priority: string;
  displayName: string | null;
}>> {
  const result = await pool.query<{
    taskId: number;
    peerId: number;
    dueAt: Date;
    status: string;
    why: string;
    priority: string;
    displayName: string | null;
  }>(
    `
SELECT
  t.task_id as "taskId",
  t.peer_id as "peerId",
  t.due_at as "dueAt",
  t.status,
  t.why,
  t.priority,
  p.display_name as "displayName"
FROM tasks t
LEFT JOIN peers p
  ON p.account_id = t.account_id
 AND p.peer_id = t.peer_id
WHERE t.account_id = $1
  AND t.status = 'open'
  AND t.due_at::date <= now()::date
ORDER BY t.due_at ASC
`,
    [params.accountId.toString()],
  );
  return result.rows;
}

export async function listTasksForPeer(
  pool: DbPool,
  params: { accountId: bigint; peerId: number },
): Promise<Array<{ taskId: number; dueAt: Date; why: string; priority: string; status: string }>> {
  const result = await pool.query<{
    taskId: number;
    dueAt: Date;
    why: string;
    priority: string;
    status: string;
  }>(
    `
SELECT
  task_id as "taskId",
  due_at as "dueAt",
  why,
  priority,
  status
FROM tasks
WHERE account_id = $1 AND peer_id = $2
ORDER BY due_at ASC
`,
    [params.accountId.toString(), params.peerId],
  );
  return result.rows;
}

export async function upsertSummary(
  pool: DbPool,
  params: {
    accountId: bigint;
    peerId: number;
    kind: 'rolling' | 'since_last_seen';
    content: string;
    sourceModel?: string;
  },
): Promise<void> {
  await pool.query(
    `
INSERT INTO summaries (account_id, peer_id, kind, content, source_model, updated_at)
VALUES ($1, $2, $3, $4, $5, now())
ON CONFLICT (account_id, peer_id, kind)
DO UPDATE SET
  content = excluded.content,
  source_model = excluded.source_model,
  updated_at = now()
`,
    [
      params.accountId.toString(),
      params.peerId,
      params.kind,
      params.content,
      params.sourceModel ?? null,
    ],
  );
}

export async function getSummary(
  pool: DbPool,
  params: { accountId: bigint; peerId: number; kind: 'rolling' | 'since_last_seen' },
): Promise<{ content: string; updatedAt: Date } | null> {
  const result = await pool.query<{ content: string; updatedAt: Date }>(
    `
SELECT content, updated_at as "updatedAt"
FROM summaries
WHERE account_id = $1 AND peer_id = $2 AND kind = $3
LIMIT 1
`,
    [params.accountId.toString(), params.peerId, params.kind],
  );
  return result.rows[0] ?? null;
}

export async function addAutomationRule(
  pool: DbPool,
  params: {
    accountId: bigint;
    name: string;
    containsText: string;
    setTag?: string;
    followupDays?: number;
  },
): Promise<number> {
  const result = await pool.query<{ rule_id: number }>(
    `
INSERT INTO automation_rules (account_id, name, contains_text, set_tag, followup_days)
VALUES ($1, $2, $3, $4, $5)
RETURNING rule_id
`,
    [
      params.accountId.toString(),
      params.name,
      params.containsText,
      params.setTag ?? null,
      params.followupDays ?? null,
    ],
  );
  return result.rows[0].rule_id;
}

export async function listAutomationRules(
  pool: DbPool,
  params: { accountId: bigint },
): Promise<Array<{
  ruleId: number;
  name: string;
  containsText: string;
  setTag: string | null;
  followupDays: number | null;
  enabled: boolean;
}>> {
  const result = await pool.query<{
    ruleId: number;
    name: string;
    containsText: string;
    setTag: string | null;
    followupDays: number | null;
    enabled: boolean;
  }>(
    `
SELECT
  rule_id as "ruleId",
  name,
  contains_text as "containsText",
  set_tag as "setTag",
  followup_days as "followupDays",
  enabled
FROM automation_rules
WHERE account_id = $1
ORDER BY rule_id ASC
`,
    [params.accountId.toString()],
  );
  return result.rows;
}

export async function addRuleEvent(
  pool: DbPool,
  params: { accountId: bigint; ruleId: number; peerId: number; note: string },
): Promise<void> {
  await pool.query(
    `
INSERT INTO rule_events (account_id, rule_id, peer_id, note)
VALUES ($1, $2, $3, $4)
`,
    [params.accountId.toString(), params.ruleId, params.peerId, params.note],
  );
}

export async function listRuleEvents(
  pool: DbPool,
  params: { accountId: bigint; limit: number },
): Promise<Array<{ eventId: number; ruleId: number; peerId: number; note: string; createdAt: Date }>> {
  const result = await pool.query<{
    eventId: number;
    ruleId: number;
    peerId: number;
    note: string;
    createdAt: Date;
  }>(
    `
SELECT
  event_id as "eventId",
  rule_id as "ruleId",
  peer_id as "peerId",
  note,
  created_at as "createdAt"
FROM rule_events
WHERE account_id = $1
ORDER BY created_at DESC
LIMIT $2
`,
    [params.accountId.toString(), params.limit],
  );
  return result.rows;
}

export async function searchLocalMessages(
  pool: DbPool,
  params: {
    accountId: bigint;
    query: string;
    limit: number;
    peerId?: number;
    tag?: string;
    company?: string;
  },
): Promise<Array<{
  peerId: number;
  messageId: number;
  sentAt: Date;
  text: string;
  displayName: string | null;
}>> {
  const clauses = ['m.account_id = $1', 'm.text ILIKE $2'];
  const values: Array<string | number> = [params.accountId.toString(), `%${params.query}%`];
  let index = values.length + 1;

  if (params.peerId) {
    clauses.push(`m.peer_id = $${index}`);
    values.push(params.peerId);
    index += 1;
  }

  if (params.tag) {
    clauses.push(
      `EXISTS (SELECT 1 FROM peer_tags pt WHERE pt.account_id = m.account_id AND pt.peer_id = m.peer_id AND pt.tag = $${index})`,
    );
    values.push(params.tag);
    index += 1;
  }

  if (params.company) {
    clauses.push(
      `EXISTS (
        SELECT 1
        FROM peer_company pc
        JOIN companies c ON c.company_id = pc.company_id
        WHERE pc.account_id = m.account_id
          AND pc.peer_id = m.peer_id
          AND c.name = $${index}
      )`,
    );
    values.push(params.company);
    index += 1;
  }

  values.push(params.limit);

  const result = await pool.query<{
    peerId: number;
    messageId: number;
    sentAt: Date;
    text: string;
    displayName: string | null;
  }>(
    `
SELECT
  m.peer_id as "peerId",
  m.message_id as "messageId",
  m.sent_at as "sentAt",
  m.text,
  p.display_name as "displayName"
FROM messages m
LEFT JOIN peers p
  ON p.account_id = m.account_id
 AND p.peer_id = m.peer_id
WHERE ${clauses.join(' AND ')}
ORDER BY m.sent_at DESC
LIMIT $${index}
`,
    values,
  );

  return result.rows;
}

export async function updateSyncCursor(
  pool: DbPool,
  params: {
    accountId: bigint;
    peerId: number;
    lastSyncedMessageId?: number;
    error?: string;
  },
): Promise<void> {
  await pool.query(
    `
INSERT INTO sync_cursors (
  account_id,
  peer_id,
  last_synced_message_id,
  last_synced_at,
  last_run_at,
  error
)
VALUES ($1, $2, $3, now(), now(), $4)
ON CONFLICT (account_id, peer_id)
DO UPDATE SET
  last_synced_message_id = COALESCE(excluded.last_synced_message_id, sync_cursors.last_synced_message_id),
  last_synced_at = now(),
  last_run_at = now(),
  error = excluded.error
`,
    [
      params.accountId.toString(),
      params.peerId,
      params.lastSyncedMessageId ?? null,
      params.error ?? null,
    ],
  );
}
