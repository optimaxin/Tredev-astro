import { query, queryOne, type Executor } from '../core/db.ts';
import type { RequestResult } from '../models/types.ts';

// Idempotency cache for booking requests — must survive a restart, or a
// client retry right after a crash could double-book an astrologer. Both
// functions accept an optional `executor` because requestConsultation in
// realtimeStore.ts runs them inside the same locked transaction as the
// booking decision itself, so a duplicate requestId can't slip in between
// the check and the write even under a genuine race.
export async function getProcessedResult(requestId: string, executor?: Executor): Promise<RequestResult | undefined> {
  const row = await queryOne<{ result_json: string }>('SELECT result_json FROM processed_requests WHERE request_id = $1', [requestId], executor);
  return row ? (JSON.parse(row.result_json) as RequestResult) : undefined;
}

export async function saveProcessedResult(requestId: string, result: RequestResult, executor?: Executor) {
  await query(
    `INSERT INTO processed_requests (request_id, result_json, created_at) VALUES ($1, $2, $3)
     ON CONFLICT (request_id) DO UPDATE SET result_json = EXCLUDED.result_json, created_at = EXCLUDED.created_at`,
    [requestId, JSON.stringify(result), Date.now()],
    executor
  );
}
