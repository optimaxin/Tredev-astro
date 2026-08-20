import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.ts';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, '..', '..', 'migrations');

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // Supabase's direct-connection endpoint requires TLS; it uses a
  // certificate chain Node doesn't have pinned locally, so this trusts the
  // connection without verifying the chain. Fine for this project's threat
  // model (a hosted DB reached over its own TLS-encrypted connection); a
  // stricter deployment would pin Supabase's CA certificate instead.
  ssl: { rejectUnauthorized: false },
});

// Repository functions normally run against the shared pool, but a caller
// that needs to participate in an existing transaction (see requestConsultation
// in realtimeStore.ts) passes the transaction's client instead — both expose
// the same `.query()` shape, so every repository function accepts either.
export type Executor = Pick<pg.Pool | pg.PoolClient, 'query'>;

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: unknown[], executor: Executor = pool): Promise<T[]> {
  const result = await executor.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends pg.QueryResultRow = any>(text: string, params?: unknown[], executor: Executor = pool): Promise<T | undefined> {
  const rows = await query<T>(text, params, executor);
  return rows[0];
}

// Runs `fn` inside a single transaction on a dedicated connection. Required
// for any multi-statement write, and for anything that needs a row lock
// (`SELECT ... FOR UPDATE`) to stay race-free under concurrent requests —
// see requestConsultation() in realtimeStore.ts, which is exactly why this
// exists: node:sqlite's synchronous calls used to make that safe for free,
// but Postgres's async driver has a real `await` gap a second request can
// land in, so the lock has to be earned explicitly now.
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Minimal versioned migration runner: every .sql file in migrations/ runs at
// most once, in filename order, inside its own transaction.
export async function runMigrations() {
  await pool.query('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at BIGINT NOT NULL)');
  const applied = new Set((await query<{ name: string }>('SELECT name FROM _migrations')).map(r => r.name));
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    await withTransaction(async client => {
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name, applied_at) VALUES ($1, $2)', [file, Date.now()]);
    });
    console.log(`[db] applied migration ${file}`);
  }
}
