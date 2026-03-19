import blessed from 'blessed';
import type { AppContext } from '../app/context.js';
import { requireDb } from '../app/db.js';
import { requireAccountId } from '../app/account.js';
import { listFlowRuns } from '../db/flows.js';
import { loadFlowCatalog } from './catalog.js';

function formatFlowList(names: Array<{ id: string; name: string }>): string {
  return names.map((flow) => `• ${flow.name} (${flow.id})`).join('\n');
}

function formatRunList(
  runs: Array<{
    runId: number;
    flowId: string;
    status: string;
    startedAt: Date;
  }>,
): string {
  if (runs.length === 0) {
    return 'No flow runs yet.';
  }

  return runs
    .map(
      (run) =>
        `#${run.runId}  ${run.flowId}\n${run.status.toUpperCase()}  ${run.startedAt.toISOString()}`,
    )
    .join('\n\n');
}

export async function renderFlowDashboard(ctx: AppContext): Promise<void> {
  const db = requireDb(ctx);
  const accountId = await requireAccountId(ctx);
  const [flows, recentRuns] = await Promise.all([
    loadFlowCatalog(),
    listFlowRuns(db, { accountId, limit: 8 }),
  ]);
  const latestRun = recentRuns[0] ?? null;

  await new Promise<void>((resolve) => {
    const screen = blessed.screen({
      smartCSR: true,
      title: 'tgchats Flows Dashboard',
    });

    const header = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: ' tgchats Flows Dashboard  |  q / esc / ctrl-c to exit ',
      style: {
        fg: 'black',
        bg: 'green',
      },
    });

    const flowsBox = blessed.box({
      parent: screen,
      top: 3,
      left: 0,
      width: '40%',
      height: '60%',
      label: ' Flows ',
      border: 'line',
      padding: {
        left: 1,
        right: 1,
      },
      scrollable: true,
      alwaysScroll: true,
      content: formatFlowList(flows.map((flow) => ({ id: flow.id, name: flow.name }))),
    });

    const runsBox = blessed.box({
      parent: screen,
      top: 3,
      left: '40%',
      width: '60%',
      height: '60%',
      label: ' Recent Runs ',
      border: 'line',
      padding: {
        left: 1,
        right: 1,
      },
      scrollable: true,
      alwaysScroll: true,
      content: formatRunList(recentRuns),
    });

    const detailLines = latestRun
      ? [
          `Run #${latestRun.runId}`,
          `Flow: ${latestRun.flowId}`,
          `Status: ${latestRun.status}`,
          `Started: ${latestRun.startedAt.toISOString()}`,
          `Finished: ${latestRun.finishedAt?.toISOString() ?? '-'}`,
          '',
          `Summary: ${latestRun.summary ?? '-'}`,
          '',
          `Budget: ${JSON.stringify(latestRun.budgetSnapshot, null, 2)}`,
          '',
          `Final Outputs: ${JSON.stringify(latestRun.finalOutputs, null, 2)}`,
        ]
      : ['No completed runs to inspect yet.'];

    const detailBox = blessed.box({
      parent: screen,
      top: '63%',
      left: 0,
      width: '100%',
      height: '37%',
      label: ' Latest Run Detail ',
      border: 'line',
      padding: {
        left: 1,
        right: 1,
      },
      scrollable: true,
      alwaysScroll: true,
      content: detailLines.join('\n'),
    });

    screen.key(['q', 'escape', 'C-c'], () => {
      header.destroy();
      flowsBox.destroy();
      runsBox.destroy();
      detailBox.destroy();
      screen.destroy();
      resolve();
    });

    screen.render();
  });
}
