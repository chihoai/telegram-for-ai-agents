import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFlowDefinition, type FlowDefinition } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FLOWS_DIR = path.resolve(__dirname, '../../flows');

let cachedFlows: FlowDefinition[] | null = null;

export async function loadFlowCatalog(): Promise<FlowDefinition[]> {
  if (cachedFlows) {
    return cachedFlows;
  }

  const entries = await fs.readdir(FLOWS_DIR);
  const flows: FlowDefinition[] = [];

  for (const entry of entries.sort()) {
    if (!entry.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(FLOWS_DIR, entry), 'utf8');
    flows.push(validateFlowDefinition(JSON.parse(raw)));
  }

  cachedFlows = flows;
  return flows;
}

export async function getFlowDefinition(flowId: string): Promise<FlowDefinition> {
  const flows = await loadFlowCatalog();
  const flow = flows.find((item) => item.id === flowId);
  if (!flow) {
    throw new Error(`Unknown flow: ${flowId}`);
  }
  return flow;
}

export function clearFlowCatalogCache(): void {
  cachedFlows = null;
}
