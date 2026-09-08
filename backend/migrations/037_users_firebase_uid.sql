-- Links a local user row to a Firebase Auth identity (Google sign-in, Phone
-- Auth) — see authService.ts's loginWithFirebase(). Nullable: existing
-- email/password accounts have none until they first sign in via Firebase
-- (Google with the same email links automatically; a brand-new Firebase
-- sign-in gets a fresh local account).
ALTER TABLE users ADD COLUMN firebase_uid TEXT UNIQUE;
