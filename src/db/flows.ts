import type { DbPool } from './pool.js';
import type {
  FlowBudgetUsage,
  FlowDefinition,
  FlowPlannerResponse,
  FlowRunStatus,
} from '../flows/types.js';

export interface FlowRunRow {
  runId: number;
  accountId: string;
  flowId: string;
  status: FlowRunStatus;
  startedAt: Date;
  finishedAt: Date | null;
  summary: string | null;
  definitionSnapshot: FlowDefinition;
  discoverSnapshot: Record<string, unknown>;
  plannerSnapshot: FlowPlannerResponse | null;
  budgetSnapshot: FlowBudgetUsage;
  finalOutputs: Record<string, unknown>;
  error: string | null;
}

export interface FlowRunStepRow {
  stepId: number;
  runId: number;
  stepIndex: number;
  stepType: string;
  toolName: string | null;
  status: string;
  attempt: number;
  decision: Record<string, unknown> | null;
  toolArgs: Record<string, unknown> | null;
  toolResult: Record<string, unknown> | null;
  verification: Record<string, unknown> | null;
  error: string | null;
  createdAt: Date;
}

export interface OutboundMessageRow {
  outboundId: number;
  accountId: string;
  runId: number | null;
  peerId: number;
  telegramMessageId: number | null;
  text: string;
  status: string;
  reason: string;
  expectedLastMessageId: number | null;
  observedLastMessageId: number | null;
  verification: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AgentIdentityRow {
  identityId: number;
  accountId: string;
  agentRegistry: string;
  agentId: string;
  txHash: string;
  operatorWallet: string;
  registryAddress: string;
  chainId: string;
  agentUri: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

function jsonParam(value: unknown): string {
  return JSON.stringify(value ?? {});
}

export async function createFlowRun(
  pool: DbPool,
  params: {
    accountId: bigint;
    flowId: string;
    status: FlowRunStatus;
    definitionSnapshot: FlowDefinition;
    discoverSnapshot: Record<string, unknown>;
    budgetSnapshot: FlowBudgetUsage;
  },
): Promise<number> {
  const result = await pool.query<{ runId: number }>(
    `
INSERT INTO flow_runs (
  account_id,
  flow_id,
  status,
  definition_snapshot,
  discover_snapshot,
  budget_snapshot
)
VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
RETURNING run_id as "runId"
`,
    [
      params.accountId.toString(),
      params.flowId,
      params.status,
      jsonParam(params.definitionSnapshot),
      jsonParam(params.discoverSnapshot),
      jsonParam(params.budgetSnapshot),
    ],
  );
  return result.rows[0].runId;
}

export async function updateFlowRun(
  pool: DbPool,
  params: {
    runId: number;
    status: FlowRunStatus;
    summary?: string;
    plannerSnapshot?: FlowPlannerResponse | null;
    budgetSnapshot?: FlowBudgetUsage;
    finalOutputs?: Record<string, unknown>;
    error?: string | null;
    finished?: boolean;
  },
): Promise<void> {
  await pool.query(
    `
UPDATE flow_runs
SET
  status = $2,
  summary = COALESCE($3, summary),
  planner_snapshot = COALESCE($4::jsonb, planner_snapshot),
  budget_snapshot = COALESCE($5::jsonb, budget_snapshot),
  final_outputs = COALESCE($6::jsonb, final_outputs),
  error = COALESCE($7, error),
  finished_at = CASE WHEN $8 THEN now() ELSE finished_at END
WHERE run_id = $1
`,
    [
      params.runId,
      params.status,
      params.summary ?? null,
      params.plannerSnapshot === undefined ? null : jsonParam(params.plannerSnapshot),
      params.budgetSnapshot === undefined ? null : jsonParam(params.budgetSnapshot),
      params.finalOutputs === undefined ? null : jsonParam(params.finalOutputs),
      params.error ?? null,
      params.finished ?? false,
    ],
  );
}

export async function appendFlowRunStep(
  pool: DbPool,
  params: {
    runId: number;
    stepIndex: number;
    stepType: string;
    toolName?: string | null;
    status: string;
    attempt: number;
    decision?: Record<string, unknown> | null;
    toolArgs?: Record<string, unknown> | null;
    toolResult?: Record<string, unknown> | null;
    verification?: Record<string, unknown> | null;
    error?: string | null;
  },
): Promise<number> {
  const result = await pool.query<{ stepId: number }>(
    `
INSERT INTO flow_run_steps (
  run_id,
  step_index,
  step_type,
  tool_name,
  status,
  attempt,
  decision,
  tool_args,
  tool_result,
  verification,
  error
)
VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11)
RETURNING step_id as "stepId"
`,
    [
      params.runId,
      params.stepIndex,
      params.stepType,
      params.toolName ?? null,
      params.status,
      params.attempt,
      jsonParam(params.decision ?? null),
      jsonParam(params.toolArgs ?? null),
      jsonParam(params.toolResult ?? null),
      jsonParam(params.verification ?? null),
      params.error ?? null,
    ],
  );
  return result.rows[0].stepId;
}

export async function listFlowRuns(
  pool: DbPool,
  params: { accountId: bigint; limit: number; flowId?: string; latestSuccessful?: boolean },
): Promise<FlowRunRow[]> {
  const clauses = ['account_id = $1'];
  const values: Array<string | number | boolean> = [params.accountId.toString()];
  let index = 2;

  if (params.flowId) {
    clauses.push(`flow_id = $${index}`);
    values.push(params.flowId);
    index += 1;
  }

  if (params.latestSuccessful) {
    clauses.push(`status = $${index}`);
    values.push('completed');
    index += 1;
  }

  values.push(params.limit);

  const result = await pool.query<FlowRunRow>(
    `
SELECT
  run_id as "runId",
  account_id as "accountId",
  flow_id as "flowId",
  status,
  started_at as "startedAt",
  finished_at as "finishedAt",
  summary,
  definition_snapshot as "definitionSnapshot",
  discover_snapshot as "discoverSnapshot",
  planner_snapshot as "plannerSnapshot",
  budget_snapshot as "budgetSnapshot",
  final_outputs as "finalOutputs",
  error
FROM flow_runs
WHERE ${clauses.join(' AND ')}
ORDER BY started_at DESC
LIMIT $${index}
`,
    values,
  );
  return result.rows;
}

export async function getFlowRun(
  pool: DbPool,
  params: { accountId: bigint; runId: number },
): Promise<FlowRunRow | null> {
  const result = await pool.query<FlowRunRow>(
    `
SELECT
  run_id as "runId",
  account_id as "accountId",
  flow_id as "flowId",
  status,
  started_at as "startedAt",
  finished_at as "finishedAt",
  summary,
  definition_snapshot as "definitionSnapshot",
  discover_snapshot as "discoverSnapshot",
  planner_snapshot as "plannerSnapshot",
  budget_snapshot as "budgetSnapshot",
  final_outputs as "finalOutputs",
  error
FROM flow_runs
WHERE account_id = $1 AND run_id = $2
LIMIT 1
`,
    [params.accountId.toString(), params.runId],
  );
  return result.rows[0] ?? null;
}

export async function listFlowRunSteps(
  pool: DbPool,
  params: { runId: number },
): Promise<FlowRunStepRow[]> {
  const result = await pool.query<FlowRunStepRow>(
    `
SELECT
  step_id as "stepId",
  run_id as "runId",
  step_index as "stepIndex",
  step_type as "stepType",
  tool_name as "toolName",
  status,
  attempt,
  decision,
  tool_args as "toolArgs",
  tool_result as "toolResult",
  verification,
  error,
  created_at as "createdAt"
FROM flow_run_steps
WHERE run_id = $1
ORDER BY step_index ASC, created_at ASC
`,
    [params.runId],
  );
  return result.rows;
}

export async function recordOutboundMessage(
  pool: DbPool,
  params: {
    accountId: bigint;
    runId?: number | null;
    peerId: number;
    telegramMessageId?: number | null;
    text: string;
    status: string;
    reason: string;
    expectedLastMessageId?: number | null;
    observedLastMessageId?: number | null;
    verification?: Record<string, unknown> | null;
  },
): Promise<number> {
  const result = await pool.query<{ outboundId: number }>(
    `
INSERT INTO outbound_messages (
  account_id,
  run_id,
  peer_id,
  telegram_message_id,
  text,
  status,
  reason,
  expected_last_message_id,
  observed_last_message_id,
  verification
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
RETURNING outbound_id as "outboundId"
`,
    [
      params.accountId.toString(),
      params.runId ?? null,
      params.peerId,
      params.telegramMessageId ?? null,
      params.text,
      params.status,
      params.reason,
      params.expectedLastMessageId ?? null,
      params.observedLastMessageId ?? null,
      jsonParam(params.verification ?? null),
    ],
  );
  return result.rows[0].outboundId;
}

export async function listRecentOutboundMessages(
  pool: DbPool,
  params: { accountId: bigint; peerId: number; limit: number },
): Promise<OutboundMessageRow[]> {
  const result = await pool.query<OutboundMessageRow>(
    `
SELECT
  outbound_id as "outboundId",
  account_id as "accountId",
  run_id as "runId",
  peer_id as "peerId",
  telegram_message_id as "telegramMessageId",
  text,
  status,
  reason,
  expected_last_message_id as "expectedLastMessageId",
  observed_last_message_id as "observedLastMessageId",
  verification,
  created_at as "createdAt"
FROM outbound_messages
WHERE account_id = $1 AND peer_id = $2
ORDER BY created_at DESC
LIMIT $3
`,
    [params.accountId.toString(), params.peerId, params.limit],
  );
  return result.rows;
}

export async function countOutboundMessagesForRunPeer(
  pool: DbPool,
  params: { runId: number; peerId: number },
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `
SELECT COUNT(*)::text as "count"
FROM outbound_messages
WHERE run_id = $1 AND peer_id = $2 AND status = 'sent'
`,
    [params.runId, params.peerId],
  );
  return Number(result.rows[0]?.count ?? '0');
}

export async function insertAgentIdentity(
  pool: DbPool,
  params: {
    accountId: bigint;
    agentRegistry: string;
    agentId: string;
    txHash: string;
    operatorWallet: string;
    registryAddress: string;
    chainId: string;
    agentUri: string;
    metadata: Record<string, unknown>;
  },
): Promise<number> {
  const result = await pool.query<{ identityId: number }>(
    `
INSERT INTO agent_identity (
  account_id,
  agent_registry,
  agent_id,
  tx_hash,
  operator_wallet,
  registry_address,
  chain_id,
  agent_uri,
  metadata
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
RETURNING identity_id as "identityId"
`,
    [
      params.accountId.toString(),
      params.agentRegistry,
      params.agentId,
      params.txHash,
      params.operatorWallet,
      params.registryAddress,
      params.chainId,
      params.agentUri,
      jsonParam(params.metadata),
    ],
  );
  return result.rows[0].identityId;
}

export async function getLatestAgentIdentity(
  pool: DbPool,
  params: { accountId: bigint },
): Promise<AgentIdentityRow | null> {
  const result = await pool.query<AgentIdentityRow>(
    `
SELECT
  identity_id as "identityId",
  account_id as "accountId",
  agent_registry as "agentRegistry",
  agent_id as "agentId",
  tx_hash as "txHash",
  operator_wallet as "operatorWallet",
  registry_address as "registryAddress",
  chain_id as "chainId",
  agent_uri as "agentUri",
  metadata,
  created_at as "createdAt"
FROM agent_identity
WHERE account_id = $1
ORDER BY created_at DESC
LIMIT 1
`,
    [params.accountId.toString()],
  );
  return result.rows[0] ?? null;
}
