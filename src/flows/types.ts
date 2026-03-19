export type FlowDiscoverMode = 'recent_dialogs' | 'unread_dialogs' | 'due_tasks' | 'tagged_dialogs';

export interface FlowBudgetDefinition {
  maxCandidates: number;
  maxToolCalls: number;
  maxAiCalls: number;
  maxRetriesPerStep: number;
  maxOutboundMessages: number;
  maxWallTimeSeconds: number;
}

export interface FlowDiscoverDefinition {
  mode: FlowDiscoverMode;
  limit: number;
  requiredAnyTags?: string[];
  excludedTags?: string[];
  minUnreadCount?: number;
  staleDays?: number;
  maxHistoryMessages?: number;
}

export interface FlowGuardrails {
  requireExistingThread: boolean;
  maxInactiveDays: number;
  dedupeWindowDays: number;
  blockIfLatestMessageChanged: boolean;
  abortOnGuardrailFailure: boolean;
  allowSend: boolean;
}

export interface FlowVerificationDefinition {
  verifyCrmMutations: boolean;
  verifyMessageSend: boolean;
  requireHistoryEcho: boolean;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  personas: string[];
  taskCategories: string[];
  discover: FlowDiscoverDefinition;
  allowedTools: string[];
  allowedActions: string[];
  budget: FlowBudgetDefinition;
  guardrails: FlowGuardrails;
  verification: FlowVerificationDefinition;
  outputs: string[];
  defaultMessageStyle: 'concise' | 'friendly';
  plannerPrompt: string;
}

export interface FlowCandidateSnapshot {
  peerId: number;
  peerDisplayName: string;
  username: string | null;
  peerKind: string;
  unreadCount: number;
  archived: boolean;
  pinned: boolean;
  lastMessageId: number | null;
  lastMessageAt: string | null;
  tags: string[];
  companyName: string | null;
  role: string | null;
  openTasks: Array<{
    taskId: number;
    dueAt: string;
    why: string;
    priority: string;
    status: string;
  }>;
  rollingSummary: string | null;
  recentMessages: Array<{
    sender: string;
    text: string;
    at: string;
  }>;
}

export interface FlowPlanCandidate {
  peerId: number;
  shouldAct: boolean;
  reason: string;
  refreshSummary: boolean;
  setTags: string[];
  companyName: string | null;
  role: string | null;
  createTask: boolean;
  dueInDays: number | null;
  taskWhy: string | null;
  taskPriority: 'low' | 'med' | 'high';
  sendSuggested: boolean;
  sendStyle: 'concise' | 'friendly';
  avoidQuestion: boolean;
  handoffNote: string | null;
}

export interface FlowPlannerResponse {
  globalSummary: string;
  plans: FlowPlanCandidate[];
}

export interface FlowBudgetUsage {
  maxCandidates: number;
  maxToolCalls: number;
  maxAiCalls: number;
  maxRetriesPerStep: number;
  maxOutboundMessages: number;
  maxWallTimeSeconds: number;
  toolCallsUsed: number;
  aiCallsUsed: number;
  outboundMessagesUsed: number;
  retriesUsed: number;
  startedAt: string;
}

export type FlowRunStatus =
  | 'planned'
  | 'running'
  | 'completed'
  | 'handoff_required'
  | 'aborted'
  | 'failed';

function expectString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function expectStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array.`);
  }

  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error(`${label} must contain strings.`);
  }

  return items;
}

function expectPositiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return Number(value);
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  return expectStringArray(value, 'optional array');
}

export function validateFlowDefinition(raw: unknown): FlowDefinition {
  const row = (typeof raw === 'object' && raw ? raw : {}) as Record<string, unknown>;
  const discover = (typeof row.discover === 'object' && row.discover
    ? row.discover
    : {}) as Record<string, unknown>;
  const budget = (typeof row.budget === 'object' && row.budget
    ? row.budget
    : {}) as Record<string, unknown>;
  const guardrails = (typeof row.guardrails === 'object' && row.guardrails
    ? row.guardrails
    : {}) as Record<string, unknown>;
  const verification = (typeof row.verification === 'object' && row.verification
    ? row.verification
    : {}) as Record<string, unknown>;

  const mode = expectString(discover.mode, 'discover.mode');
  if (!['recent_dialogs', 'unread_dialogs', 'due_tasks', 'tagged_dialogs'].includes(mode)) {
    throw new Error(`discover.mode is invalid: ${mode}`);
  }

  const defaultMessageStyle = expectString(
    row.defaultMessageStyle,
    'defaultMessageStyle',
  );
  if (!['concise', 'friendly'].includes(defaultMessageStyle)) {
    throw new Error('defaultMessageStyle must be concise|friendly.');
  }

  return {
    id: expectString(row.id, 'id'),
    name: expectString(row.name, 'name'),
    description: expectString(row.description, 'description'),
    personas: expectStringArray(row.personas, 'personas'),
    taskCategories: expectStringArray(row.taskCategories, 'taskCategories'),
    discover: {
      mode: mode as FlowDiscoverMode,
      limit: expectPositiveInteger(discover.limit, 'discover.limit'),
      requiredAnyTags: optionalStringArray(discover.requiredAnyTags),
      excludedTags: optionalStringArray(discover.excludedTags),
      minUnreadCount:
        discover.minUnreadCount === undefined
          ? undefined
          : expectPositiveInteger(discover.minUnreadCount, 'discover.minUnreadCount'),
      staleDays:
        discover.staleDays === undefined
          ? undefined
          : expectPositiveInteger(discover.staleDays, 'discover.staleDays'),
      maxHistoryMessages:
        discover.maxHistoryMessages === undefined
          ? undefined
          : expectPositiveInteger(discover.maxHistoryMessages, 'discover.maxHistoryMessages'),
    },
    allowedTools: expectStringArray(row.allowedTools, 'allowedTools'),
    allowedActions: expectStringArray(row.allowedActions, 'allowedActions'),
    budget: {
      maxCandidates: expectPositiveInteger(budget.maxCandidates, 'budget.maxCandidates'),
      maxToolCalls: expectPositiveInteger(budget.maxToolCalls, 'budget.maxToolCalls'),
      maxAiCalls: expectPositiveInteger(budget.maxAiCalls, 'budget.maxAiCalls'),
      maxRetriesPerStep: expectPositiveInteger(
        budget.maxRetriesPerStep,
        'budget.maxRetriesPerStep',
      ),
      maxOutboundMessages: expectPositiveInteger(
        budget.maxOutboundMessages,
        'budget.maxOutboundMessages',
      ),
      maxWallTimeSeconds: expectPositiveInteger(
        budget.maxWallTimeSeconds,
        'budget.maxWallTimeSeconds',
      ),
    },
    guardrails: {
      requireExistingThread: Boolean(guardrails.requireExistingThread),
      maxInactiveDays: expectPositiveInteger(
        guardrails.maxInactiveDays,
        'guardrails.maxInactiveDays',
      ),
      dedupeWindowDays: expectPositiveInteger(
        guardrails.dedupeWindowDays,
        'guardrails.dedupeWindowDays',
      ),
      blockIfLatestMessageChanged: Boolean(guardrails.blockIfLatestMessageChanged),
      abortOnGuardrailFailure: Boolean(guardrails.abortOnGuardrailFailure),
      allowSend: Boolean(guardrails.allowSend),
    },
    verification: {
      verifyCrmMutations: Boolean(verification.verifyCrmMutations),
      verifyMessageSend: Boolean(verification.verifyMessageSend),
      requireHistoryEcho: Boolean(verification.requireHistoryEcho),
    },
    outputs: expectStringArray(row.outputs, 'outputs'),
    defaultMessageStyle: defaultMessageStyle as 'concise' | 'friendly',
    plannerPrompt: expectString(row.plannerPrompt, 'plannerPrompt'),
  };
}
