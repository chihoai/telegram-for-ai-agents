import type { DbPool } from './pool.js';
import { MIGRATIONS } from './schema.js';

export async function migrate(pool: DbPool): Promise<void> {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );

  const applied = await pool.query<{ id: string }>('SELECT id FROM schema_migrations');
  const appliedSet = new Set(applied.rows.map((row: { id: string }) => row.id));

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.id)) {
      continue;
    }
    await pool.query('BEGIN');
    try {
      await pool.query(migration.sql);
      await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}
