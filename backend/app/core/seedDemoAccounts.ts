import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../repositories/userRepository.ts';
import { findAstrologerByUserId, insertAstrologerForUser } from '../repositories/astrologerRepository.ts';

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
    let user = await findUserByEmail(acc.email);
    if (!user) {
      user = await createUser({ name: acc.name, email: acc.email, passwordHash: bcrypt.hashSync(acc.password, 12), role: acc.role });
    }

    // The originally-seeded catalog roster (seedAstrologerCatalog.ts) has no
    // real account behind it, so the demo astrologer login would otherwise
    // have no catalog row at all — unable to go online, accept consultations,
    // or show up in its own dashboard's real data. Give it one, same as the
    // real apply→approve flow does for a genuine astrologer account.
    if (acc.role === 'ASTROLOGIST' && !(await findAstrologerByUserId(user.id))) {
      await insertAstrologerForUser(user.id, user.name, 'General Astrology');
    }
  }
}
