export type Role = 'USER' | 'ASTROLOGIST' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  status: AccountStatus;
  created_at: number;
}

// Safe-to-expose shape — never send password_hash to a client.
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
}

export function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status };
}
