import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import type { AppConfig } from '../app/config.js';

const ERC8004_REGISTRY_ABI = [
  'function register(string agentURI) returns (uint256 agentId)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed operator)',
];

export interface IdentityEnvConfig {
  rpcUrl: string;
  operatorPrivateKey: string;
  registryAddress: string;
}

export interface IdentityRegistryAdapter {
  readonly registryAddress: string;
  getOperatorWallet(): Promise<string>;
  getChainId(): Promise<string>;
  register(agentUri: string): Promise<{
    agentId: string;
    txHash: string;
  }>;
}

export interface IdentityRegistrationResult {
  agentRegistry: string;
  agentId: string;
  txHash: string;
  operatorWallet: string;
  registryAddress: string;
  chainId: string;
  agentUri: string;
}

export function loadIdentityEnvConfig(config: AppConfig): IdentityEnvConfig {
  if (!config.evmRpcUrl) {
    throw new Error('EVM_RPC_URL is required for identity registration.');
  }
  if (!config.agentOperatorPrivateKey) {
    throw new Error('AGENT_OPERATOR_PRIVATE_KEY is required for identity registration.');
  }
  if (!config.erc8004IdentityRegistryAddress) {
    throw new Error('ERC8004_IDENTITY_REGISTRY_ADDRESS is required for identity registration.');
  }

  return {
    rpcUrl: config.evmRpcUrl,
    operatorPrivateKey: config.agentOperatorPrivateKey,
    registryAddress: config.erc8004IdentityRegistryAddress,
  };
}

export function resolveOperatorWallet(config: AppConfig): string | null {
  if (!config.agentOperatorPrivateKey) {
    return null;
  }
  return new Wallet(config.agentOperatorPrivateKey).address;
}

class EthersIdentityRegistryAdapter implements IdentityRegistryAdapter {
  readonly registryAddress: string;
  private readonly provider: JsonRpcProvider;
  private readonly wallet: Wallet;
  private readonly contract: Contract;

  constructor(config: IdentityEnvConfig) {
    this.registryAddress = config.registryAddress;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.operatorPrivateKey, this.provider);
    this.contract = new Contract(config.registryAddress, ERC8004_REGISTRY_ABI, this.wallet);
  }

  async getOperatorWallet(): Promise<string> {
    return this.wallet.address;
  }

  async getChainId(): Promise<string> {
    const network = await this.provider.getNetwork();
    return network.chainId.toString();
  }

  async register(agentUri: string): Promise<{ agentId: string; txHash: string }> {
    const agentId = await this.contract.register.staticCall(agentUri);
    const tx = await this.contract.register(agentUri);
    const receipt = await tx.wait();
    return {
      agentId: agentId.toString(),
      txHash: receipt.hash,
    };
  }
}

export function createIdentityRegistryAdapter(
  config: IdentityEnvConfig,
): IdentityRegistryAdapter {
  return new EthersIdentityRegistryAdapter(config);
}

export async function registerIdentityArtifact(
  agentArtifact: unknown,
  adapter: IdentityRegistryAdapter,
): Promise<IdentityRegistrationResult> {
  const agentUri = `data:application/json;base64,${Buffer.from(
    JSON.stringify(agentArtifact),
    'utf8',
  ).toString('base64')}`;
  const [operatorWallet, chainId, registration] = await Promise.all([
    adapter.getOperatorWallet(),
    adapter.getChainId(),
    adapter.register(agentUri),
  ]);

  return {
    agentRegistry: `erc8004:eip155:${chainId}:${adapter.registryAddress}:${registration.agentId}`,
    agentId: registration.agentId,
    txHash: registration.txHash,
    operatorWallet,
    registryAddress: adapter.registryAddress,
    chainId,
    agentUri,
  };
}
