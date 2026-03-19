import type { AppContext } from '../app/context.js';
import { hasFlag, optionValue, parseCommandArgs, parsePositiveInt } from '../app/cli-args.js';
import { requireAccountId } from '../app/account.js';
import { requireDb } from '../app/db.js';
import {
  getLatestAgentIdentity,
  getFlowRun,
  listFlowRunSteps,
  listFlowRuns,
} from '../db/flows.js';
import {
  buildAgentArtifact,
  buildAgentLogArtifact,
  writeArtifactJson,
} from '../flows/artifacts.js';
import { getFlowDefinition, loadFlowCatalog } from '../flows/catalog.js';
import { renderFlowDashboard } from '../flows/dashboard.js';
import { getFlowRunForExport, runFlow } from '../flows/runtime.js';
import { resolveOperatorWallet } from '../identity/registry.js';
import { printJson } from '../output.js';

export async function runFlows(ctx: AppContext, args: string[]): Promise<void> {
  const sub = args[0];
  if (!sub) {
    throw new Error(
      'Usage: tgchats flows <list|show|run|status|dashboard|export-agent|export-log> ...',
    );
  }

  if (sub === 'list') {
    const flows = await loadFlowCatalog();
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        count: flows.length,
        flows,
      });
      return;
    }
    for (const flow of flows) {
      console.log(`${flow.id} | ${flow.name} | ${flow.personas.join(', ')}`);
    }
    return;
  }

  if (sub === 'show') {
    const flowId = args[1];
    if (!flowId) {
      throw new Error('Usage: tgchats flows show <flowId>');
    }
    const flow = await getFlowDefinition(flowId);
    if (ctx.config.jsonOutput) {
      printJson({ ok: true, flow });
      return;
    }
    console.log(JSON.stringify(flow, null, 2));
    return;
  }

  if (sub === 'run') {
    const flowId = args[1];
    if (!flowId) {
      throw new Error('Usage: tgchats flows run <flowId> [--dry-run]');
    }
    const result = await runFlow(ctx, {
      flowId,
      dryRun: args.includes('--dry-run'),
    });
    if (ctx.config.jsonOutput) {
      printJson(result);
      return;
    }
    console.log(`Flow ${flowId} finished with status ${result.status}. Run #${result.runId}.`);
    console.log(result.summary);
    return;
  }

  if (sub === 'status') {
    const db = requireDb(ctx);
    const accountId = await requireAccountId(ctx);
    const parsed = parseCommandArgs(args.slice(1), ['--run-id']);
    const latestSuccessful = hasFlag(parsed, ['--latest-success']);
    const runIdRaw = optionValue(parsed, ['--run-id']) ?? parsed.positionals[0];

    if (runIdRaw) {
      const runId = parsePositiveInt(runIdRaw, '--run-id');
      const run = await getFlowRun(db, { accountId, runId });
      if (!run) {
        throw new Error(`Flow run not found: ${runId}`);
      }
      if (ctx.config.jsonOutput) {
        printJson({ ok: true, run });
        return;
      }
      console.log(JSON.stringify(run, null, 2));
      return;
    }

    const runs = await listFlowRuns(db, {
      accountId,
      limit: latestSuccessful ? 1 : 5,
      latestSuccessful,
    });
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        count: runs.length,
        runs,
      });
      return;
    }
    if (runs.length === 0) {
      console.log('No flow runs found.');
      return;
    }
    for (const run of runs) {
      console.log(
        `#${run.runId} | ${run.flowId} | ${run.status} | ${run.startedAt.toISOString()}`,
      );
    }
    return;
  }

  if (sub === 'dashboard') {
    await renderFlowDashboard(ctx);
    return;
  }

  if (sub === 'export-agent') {
    const parsed = parseCommandArgs(args.slice(1), ['--out']);
    const outPath = optionValue(parsed, ['--out']);
    const db = requireDb(ctx);
    const accountId = await requireAccountId(ctx);
    const [flowDefinitions, identity] = await Promise.all([
      loadFlowCatalog(),
      getLatestAgentIdentity(db, { accountId }),
    ]);
    const artifact = buildAgentArtifact({
      flowDefinitions,
      identity,
      operatorWallet: resolveOperatorWallet(ctx.config),
    });
    const artifactPath = await writeArtifactJson(outPath, artifact, 'agent.json');
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        artifactPath,
        agent: artifact,
      });
      return;
    }
    console.log(`Wrote ${artifactPath}`);
    return;
  }

  if (sub === 'export-log') {
    const parsed = parseCommandArgs(args.slice(1), ['--out']);
    const runIdRaw = parsed.positionals[0];
    if (!runIdRaw) {
      throw new Error('Usage: tgchats flows export-log <runId> [--out ./artifacts/agent_log.json]');
    }
    const runId = parsePositiveInt(runIdRaw, '<runId>');
    const outPath = optionValue(parsed, ['--out']);
    const db = requireDb(ctx);
    const accountId = await requireAccountId(ctx);
    const [run, steps, identity] = await Promise.all([
      getFlowRunForExport(ctx, runId),
      listFlowRunSteps(db, { runId }),
      getLatestAgentIdentity(db, { accountId }),
    ]);
    const artifact = buildAgentLogArtifact({
      run,
      steps,
      identity,
    });
    const artifactPath = await writeArtifactJson(outPath, artifact, `agent_log.${runId}.json`);
    if (ctx.config.jsonOutput) {
      printJson({
        ok: true,
        artifactPath,
        run,
      });
      return;
    }
    console.log(`Wrote ${artifactPath}`);
    return;
  }

  throw new Error(`Unknown flows subcommand: ${sub}`);
}
