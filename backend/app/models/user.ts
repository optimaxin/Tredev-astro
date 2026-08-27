export type Role = 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface BirthDetails {
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone_offset_minutes: number | null;
}

export interface UserRow extends BirthDetails {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  status: AccountStatus;
  created_at: number;
  phone_number: string | null;
  phone_verified: boolean;
}

// Safe-to-expose shape — never send password_hash to a client.
export interface PublicUser extends BirthDetails {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  phone_number: string | null;
  phone_verified: boolean;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id, name: row.name, email: row.email, role: row.role, status: row.status,
    birth_date: row.birth_date, birth_time: row.birth_time, birth_place: row.birth_place,
    birth_latitude: row.birth_latitude, birth_longitude: row.birth_longitude,
    birth_timezone_offset_minutes: row.birth_timezone_offset_minutes,
    phone_number: row.phone_number, phone_verified: row.phone_verified,
  };
}
