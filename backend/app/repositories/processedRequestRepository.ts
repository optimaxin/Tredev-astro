import { db } from '../core/db.ts';
import type { RequestResult } from '../models/types.ts';

// Idempotency cache for booking requests — must survive a restart, or a
// client retry right after a crash could double-book an astrologer.
export function getProcessedResult(requestId: string): RequestResult | undefined {
  const row = db.prepare('SELECT result_json FROM processed_requests WHERE request_id = ?').get(requestId) as { result_json: string } | undefined;
  return row ? (JSON.parse(row.result_json) as RequestResult) : undefined;
}

export function saveProcessedResult(requestId: string, result: RequestResult) {
  db.prepare('INSERT OR REPLACE INTO processed_requests (request_id, result_json, created_at) VALUES (?, ?, ?)')
    .run(requestId, JSON.stringify(result), Date.now());
}
