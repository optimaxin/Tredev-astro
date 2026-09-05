import { query, queryOne } from '../core/db.ts';

// Canonical list of toggleable admin console sections — the single source
// of truth both the permission middleware (admin.routes.ts) and the Staff
// management UI's toggle switches are built from. 'staff' itself isn't in
// here: managing staff/admin accounts and their access is an ADMIN-only
// power, never delegable to a STAFF account regardless of what's toggled.
export const ADMIN_SECTIONS = [
  'overview', 'applications', 'astrologers', 'users', 'consultations', 'reports', 'orders', 'blog', 'notifications', 'audit', 'settings',
] as const;
export type AdminSectionKey = typeof ADMIN_SECTIONS[number];

export function isAdminSectionKey(value: string): value is AdminSectionKey {
  return (ADMIN_SECTIONS as readonly string[]).includes(value);
}

export async function getStaffPermissions(userId: string): Promise<AdminSectionKey[]> {
  const row = await queryOne<{ sections: AdminSectionKey[] }>('SELECT sections FROM staff_permissions WHERE user_id = $1', [userId]);
  return row?.sections ?? [];
}

export async function setStaffPermissions(userId: string, sections: AdminSectionKey[]): Promise<void> {
  await query(
    `INSERT INTO staff_permissions (user_id, sections) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET sections = $2`,
    [userId, JSON.stringify(sections)]
  );
}

export async function deleteStaffPermissions(userId: string): Promise<void> {
  await query('DELETE FROM staff_permissions WHERE user_id = $1', [userId]);
}
