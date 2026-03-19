import { describe, expect, it } from 'vitest';
import {
  registerIdentityArtifact,
  type IdentityRegistryAdapter,
} from './registry.js';

describe('registerIdentityArtifact', () => {
  it('builds a data URI and returns normalized identity data', async () => {
    const adapter: IdentityRegistryAdapter = {
      registryAddress: '0xabc',
      async getOperatorWallet() {
        return '0x123';
      },
      async getChainId() {
        return '8453';
      },
      async register(agentUri: string) {
        expect(agentUri.startsWith('data:application/json;base64,')).toBe(true);
        return {
          agentId: '7',
          txHash: '0xtx',
        };
      },
    };

    const result = await registerIdentityArtifact({ name: 'test-agent' }, adapter);

    expect(result.agentId).toBe('7');
    expect(result.txHash).toBe('0xtx');
    expect(result.operatorWallet).toBe('0x123');
    expect(result.agentRegistry).toContain('erc8004:eip155:8453:0xabc:7');
  });
});
