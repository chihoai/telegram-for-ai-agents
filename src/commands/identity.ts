import type { AppContext } from '../app/context.js';
import { requireAccountId } from '../app/account.js';
import { requireDb } from '../app/db.js';
import { getLatestAgentIdentity, insertAgentIdentity } from '../db/flows.js';
import { buildAgentArtifact, writeArtifactJson } from '../flows/artifacts.js';
import { loadFlowCatalog } from '../flows/catalog.js';
import {
  createIdentityRegistryAdapter,
  loadIdentityEnvConfig,
  registerIdentityArtifact,
  resolveOperatorWallet,
} from '../identity/registry.js';
import { printJson } from '../output.js';

export async function runIdentity(ctx: AppContext, args: string[]): Promise<void> {
  const db = requireDb(ctx);
  const accountId = await requireAccountId(ctx);
  const sub = args[0];

  if (!sub) {
    throw new Error('Usage: tgchats identity <show|register> ...');
  }

  if (sub === 'show') {
    const identity = await getLatestAgentIdentity(db, { accountId });
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        identity,
      });
      return;
    }
    if (!identity) {
      console.log('No ERC-8004 identity registered yet.');
      return;
    }
    console.log(`Agent registry: ${identity.agentRegistry}`);
    console.log(`Agent id: ${identity.agentId}`);
    console.log(`Tx hash: ${identity.txHash}`);
    console.log(`Operator wallet: ${identity.operatorWallet}`);
    return;
  }

  if (sub === 'register') {
    const flowDefinitions = await loadFlowCatalog();
    const existingIdentity = await getLatestAgentIdentity(db, { accountId });
    const operatorWallet = resolveOperatorWallet(ctx.config);
    const draftArtifact = buildAgentArtifact({
      flowDefinitions,
      identity: existingIdentity,
      operatorWallet,
    });
    const adapter = createIdentityRegistryAdapter(loadIdentityEnvConfig(ctx.config));
    const registration = await registerIdentityArtifact(draftArtifact, adapter);

    await insertAgentIdentity(db, {
      accountId,
      agentRegistry: registration.agentRegistry,
      agentId: registration.agentId,
      txHash: registration.txHash,
      operatorWallet: registration.operatorWallet,
      registryAddress: registration.registryAddress,
      chainId: registration.chainId,
      agentUri: registration.agentUri,
      metadata: {
        source: 'tgchats identity register',
      },
    });

    const finalArtifact = buildAgentArtifact({
      flowDefinitions,
      identity: {
        identityId: 0,
        accountId: accountId.toString(),
        agentRegistry: registration.agentRegistry,
        agentId: registration.agentId,
        txHash: registration.txHash,
        operatorWallet: registration.operatorWallet,
        registryAddress: registration.registryAddress,
        chainId: registration.chainId,
        agentUri: registration.agentUri,
        metadata: {},
        createdAt: new Date(),
      },
      operatorWallet: registration.operatorWallet,
    });
    const artifactPath = await writeArtifactJson(undefined, finalArtifact, 'agent.json');

    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        identity: registration,
        artifactPath,
      });
      return;
    }

    console.log(`Registered ERC-8004 identity ${registration.agentId}.`);
    console.log(`Artifact updated at ${artifactPath}.`);
    return;
  }

  throw new Error(`Unknown identity subcommand: ${sub}`);
}
