import { describe, expect, it } from 'vitest';
import { clearFlowCatalogCache, loadFlowCatalog } from './catalog.js';

describe('flow catalog', () => {
  it('loads the built-in flow definitions', async () => {
    clearFlowCatalogCache();
    const flows = await loadFlowCatalog();

    expect(flows).toHaveLength(5);
    expect(flows.map((flow) => flow.id)).toContain('bd.followup');
    expect(flows.every((flow) => flow.allowedTools.length > 0)).toBe(true);
    expect(flows.every((flow) => flow.outputs.includes('agent_log.json'))).toBe(true);
  });
});
