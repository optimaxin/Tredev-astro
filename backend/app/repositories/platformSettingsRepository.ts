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

// Always-cc addresses for the event notifications notificationService.ts
// sends (e.g. "a report finished") — on top of whichever user the event is
// actually about. Either can be left unset (null) to skip that recipient.
export async function getNotifyEmails(): Promise<{ adminEmail: string | null; headAstrologerEmail: string | null }> {
  const row = await queryOne<{ notify_admin_email: string | null; notify_head_astrologer_email: string | null }>(
    'SELECT notify_admin_email, notify_head_astrologer_email FROM platform_settings WHERE id = 1'
  );
  return { adminEmail: row?.notify_admin_email ?? null, headAstrologerEmail: row?.notify_head_astrologer_email ?? null };
}

export async function setNotifyEmails(input: { adminEmail: string | null; headAstrologerEmail: string | null }): Promise<void> {
  await query(
    'UPDATE platform_settings SET notify_admin_email = $1, notify_head_astrologer_email = $2 WHERE id = 1',
    [input.adminEmail, input.headAstrologerEmail]
  );
}
