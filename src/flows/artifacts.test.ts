import { describe, expect, it } from 'vitest';
import { buildAgentArtifact } from './artifacts.js';
import { loadFlowCatalog } from './catalog.js';

describe('buildAgentArtifact', () => {
  it('derives task categories and compute constraints from the flow catalog', async () => {
    const flows = await loadFlowCatalog();
    const artifact = buildAgentArtifact({
      flowDefinitions: flows,
      identity: null,
      operatorWallet: '0x1234',
      generatedAt: new Date('2026-03-19T00:00:00.000Z'),
    });

    expect(artifact.agentName).toBe('Chiho Flows Agent');
    expect(artifact.operatorWallet).toBe('0x1234');
    expect(artifact.taskCategories).toContain('support');
    expect(artifact.computeConstraints.maxToolCalls).toBe(40);
    expect(artifact.supportedTools.some((tool) => tool.name === 'flows.run')).toBe(true);
  });
});
