import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.ts';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, '..', '..', 'migrations');

mkdirSync(dirname(config.dbPath), { recursive: true });

// Node's built-in SQLite (stable since Node 22.5) — no native module build
// step required, which matters on machines without a C++ toolchain installed.
export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// node:sqlite's DatabaseSync has no built-in `.transaction()` helper (unlike
// better-sqlite3) — wrap manually, rolling back on any thrown error.
export function withTransaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Minimal versioned migration runner: every .sql file in migrations/ runs at
// most once, in filename order, inside its own transaction. Real enough for
// section 57 (versioned, reversible-by-writing-a-new-migration, documented
// by the filename) without pulling in a full migration framework.
export function runMigrations() {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
  const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map((r: any) => r.name));
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    withTransaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, Date.now());
    });
    console.log(`[db] applied migration ${file}`);
  }
}
