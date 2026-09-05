import { query, queryOne } from '../core/db.ts';

// Single-row table (id is always 1) — see migration 030. Currently only
// holds the Boost payout-share default; extend with more columns here if
// other platform-wide, staff-configurable numbers show up later.
export async function getBoostPayoutSharePercent(): Promise<number> {
  const row = await queryOne<{ boost_payout_share_percent: number }>('SELECT boost_payout_share_percent FROM platform_settings WHERE id = 1');
  return row?.boost_payout_share_percent ?? 70;
}

export async function setBoostPayoutSharePercent(percent: number): Promise<number> {
  await query('UPDATE platform_settings SET boost_payout_share_percent = $1 WHERE id = 1', [percent]);
  return percent;
}
