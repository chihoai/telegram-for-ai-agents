import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL is not set. agent.json was exported, but no latest flow run can be queried.');
  process.exit(0);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(
    `
SELECT run_id as "runId"
FROM flow_runs
WHERE status = 'completed'
ORDER BY started_at DESC
LIMIT 1
`,
  );

  const latestRunId = result.rows[0]?.runId;
  if (!latestRunId) {
    console.log('No successful flow run found yet.');
    console.log('Run one first, for example: npm run dev -- flows run bd.followup');
    process.exit(0);
  }

  console.log(`Latest successful flow run: ${latestRunId}`);
  console.log(
    `Export the matching log with: npm run dev -- flows export-log ${latestRunId} --out ./artifacts/agent_log.json`,
  );
} finally {
  await pool.end();
}
