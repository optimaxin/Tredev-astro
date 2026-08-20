import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../repositories/userRepository.ts';

// Mirrors the three DEMO_ACCOUNTS previously hardcoded in the frontend's
// localStorage-mock AppContext.tsx, so existing manual test flows (logging
// in as USER/ASTROLOGIST/ADMIN) keep working against the real backend.
// Dev/demo only — never seed accounts like this in a production database.
const DEMO_ACCOUNTS = [
  { name: 'Arjun Sharma', email: 'demo.user@tredevastro.local', password: 'DevUser@123', role: 'USER' as const },
  { name: 'Astrologist Rahul Shastri', email: 'demo.astrologer@tredevastro.local', password: 'DevAstro@123', role: 'ASTROLOGIST' as const },
  { name: 'Admin Priya Verma', email: 'demo.admin@tredevastro.local', password: 'DevAdmin@123', role: 'ADMIN' as const },
];

export async function seedDemoAccounts() {
  for (const acc of DEMO_ACCOUNTS) {
    if (await findUserByEmail(acc.email)) continue;
    await createUser({ name: acc.name, email: acc.email, passwordHash: bcrypt.hashSync(acc.password, 12), role: acc.role });
  }
}
