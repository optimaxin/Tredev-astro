// Firestore replacement for db.ts (Postgres/Supabase) — see the migration
// plan for phasing. Repositories not yet migrated keep using db.ts; each
// migrated repository imports `db` from here instead.
import { getFirebaseApp } from './firebaseAdmin.ts';

let firestoreDb: import('firebase-admin/firestore').Firestore | undefined;

export async function getDb() {
  if (firestoreDb) return firestoreDb;
  const { getFirestore } = await import('firebase-admin/firestore');
  firestoreDb = getFirestore(await getFirebaseApp());
  return firestoreDb;
}

// Re-exported so repositories can build refs/queries/transactions without
// importing the firebase-admin package directly everywhere (mirrors db.ts
// re-exporting pg's Executor-shaped helpers).
export { FieldValue, Timestamp } from 'firebase-admin/firestore';
export type { Firestore, DocumentReference, DocumentData, Transaction, CollectionReference, Query } from 'firebase-admin/firestore';
