import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOL_CONTRACT_DEFINITIONS } from '../contracts/tool-contracts.js';
import type { AgentIdentityRow, FlowRunRow, FlowRunStepRow } from '../db/flows.js';
import type { FlowDefinition } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ARTIFACTS_DIR = path.resolve(__dirname, '../../artifacts');

export interface AgentArtifact {
  type: string;
  version: string;
  generatedAt: string;
  agentName: string;
  description: string;
  operatorWallet: string | null;
  erc8004Identity: {
    agentRegistry: string;
    agentId: string;
    txHash: string;
    registryAddress: string;
    chainId: string;
  } | null;
  supportedTools: Array<{
    name: string;
    description: string;
    transport: string;
  }>;
  techStacks: string[];
  computeConstraints: Record<string, number>;
  taskCategories: string[];
  flows: Array<{
    id: string;
    name: string;
    personas: string[];
    taskCategories: string[];
    allowedActions: string[];
  }>;
  services: Array<{
    name: string;
    endpoint: string;
    transport: string;
  }>;
}

export function buildAgentArtifact(params: {
  flowDefinitions: FlowDefinition[];
  identity: AgentIdentityRow | null;
  operatorWallet: string | null;
  generatedAt?: Date;
}): AgentArtifact {
  const generatedAt = (params.generatedAt ?? new Date()).toISOString();
  const taskCategories = [
    ...new Set(params.flowDefinitions.flatMap((flow) => flow.taskCategories)),
  ].sort();

  const computeConstraints = params.flowDefinitions.reduce(
    (accumulator, flow) => ({
      maxCandidates: Math.max(accumulator.maxCandidates, flow.budget.maxCandidates),
      maxToolCalls: Math.max(accumulator.maxToolCalls, flow.budget.maxToolCalls),
      maxAiCalls: Math.max(accumulator.maxAiCalls, flow.budget.maxAiCalls),
      maxRetriesPerStep: Math.max(
        accumulator.maxRetriesPerStep,
        flow.budget.maxRetriesPerStep,
      ),
      maxOutboundMessages: Math.max(
        accumulator.maxOutboundMessages,
        flow.budget.maxOutboundMessages,
      ),
      maxWallTimeSeconds: Math.max(
        accumulator.maxWallTimeSeconds,
        flow.budget.maxWallTimeSeconds,
      ),
    }),
    {
      maxCandidates: 0,
      maxToolCalls: 0,
      maxAiCalls: 0,
      maxRetriesPerStep: 0,
      maxOutboundMessages: 0,
      maxWallTimeSeconds: 0,
    },
  );

  return {
    type: 'chiho-agent-manifest',
    version: '1.0.0',
    generatedAt,
    agentName: 'Chiho Flows Agent',
    description:
      'Autonomous Telegram workflow agent for crypto BD, marketing, investor follow-up, network coordination, and support triage.',
    operatorWallet: params.identity?.operatorWallet ?? params.operatorWallet,
    erc8004Identity: params.identity
      ? {
          agentRegistry: params.identity.agentRegistry,
          agentId: params.identity.agentId,
          txHash: params.identity.txHash,
          registryAddress: params.identity.registryAddress,
          chainId: params.identity.chainId,
        }
      : null,
    supportedTools: TOOL_CONTRACT_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      transport: tool.transport,
    })),
    techStacks: ['TypeScript', 'Node.js', 'mtcute', 'Postgres', 'MCP', 'ethers', 'blessed'],
    computeConstraints,
    taskCategories,
    flows: params.flowDefinitions.map((flow) => ({
      id: flow.id,
      name: flow.name,
      personas: flow.personas,
      taskCategories: flow.taskCategories,
      allowedActions: flow.allowedActions,
    })),
    services: [
      {
        name: 'tgchats-cli',
        endpoint: 'tgchats',
        transport: 'cli',
      },
      {
        name: 'tgchats-mcp',
        endpoint: 'local://tgchats-mcp',
        transport: 'mcp-stdio',
      },
    ],
  };
}

export function buildAgentLogArtifact(params: {
  run: FlowRunRow;
  steps: FlowRunStepRow[];
  identity: AgentIdentityRow | null;
}): Record<string, unknown> {
  return {
    run: {
      runId: params.run.runId,
      flowId: params.run.flowId,
      status: params.run.status,
      startedAt: params.run.startedAt.toISOString(),
      finishedAt: params.run.finishedAt?.toISOString() ?? null,
      summary: params.run.summary,
      error: params.run.error,
    },
    identity: params.identity
      ? {
          agentRegistry: params.identity.agentRegistry,
          agentId: params.identity.agentId,
          txHash: params.identity.txHash,
          operatorWallet: params.identity.operatorWallet,
        }
      : null,
    definition: params.run.definitionSnapshot,
    discovery: params.run.discoverSnapshot,
    planner: params.run.plannerSnapshot,
    budget: params.run.budgetSnapshot,
    finalOutputs: params.run.finalOutputs,
    steps: params.steps.map((step) => ({
      stepId: step.stepId,
      stepIndex: step.stepIndex,
      stepType: step.stepType,
      toolName: step.toolName,
      status: step.status,
      attempt: step.attempt,
      decision: step.decision,
      toolArgs: step.toolArgs,
      toolResult: step.toolResult,
      verification: step.verification,
      error: step.error,
      createdAt: step.createdAt.toISOString(),
    })),
  };
}

export async function writeArtifactJson(
  filePath: string | undefined,
  payload: unknown,
  defaultFilename: string,
): Promise<string> {
  const resolvedPath = path.resolve(filePath ?? path.join(DEFAULT_ARTIFACTS_DIR, defaultFilename));
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return resolvedPath;
}
