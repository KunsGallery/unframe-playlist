import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { publicContent } from '../src/utils/publication.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
// Requires an explicitly supplied server credential. Never prints payloads or keys.
// Dry-run by default; --apply creates an immutable private backup before replacing public docs.
export async function migrateSecurity(db, apply = false, durations = []) {
  const appId = 'unframe-playlist-v1', stamp = new Date().toISOString().replaceAll(':', '-');
  const base = db.doc(`artifacts/${appId}`), report = { apply, backupId: stamp, collections: {} };
  for (const kind of ['tracks', 'playlists', 'gathering_playlists']) {
    const source = base.collection('public').doc('data').collection(kind), snap = await source.get();
    let published = 0, hidden = 0;
    for (const record of snap.docs) {
      const data = record.data(), projected = publicContent(kind, data);
      if (projected) published++; else hidden++;
      if (apply) {
        const backup = base.collection('security_backups').doc(stamp).collection(kind).doc(record.id);
        const privateRef = base.collection('editorial').doc('data').collection(kind).doc(record.id);
        await db.runTransaction(async (tx) => {
          const [latest, privateSnap] = await Promise.all([tx.get(record.ref), tx.get(privateRef)]);
          if (!latest.exists) return;
          const original = latest.data(), source = privateSnap.exists ? privateSnap.data() : original;
          const measured = durations.find((entry) => entry.id === record.id && entry.sourceHash === createHash('sha256').update(source.audioUrl || '').digest('hex') && Number.isFinite(entry.durationSeconds) && entry.durationSeconds > 0 && entry.durationSeconds <= 86400);
          const current = kind === 'tracks' && measured ? { ...source, durationSeconds: measured.durationSeconds } : source;
          const publicDoc = publicContent(kind, current);
          tx.create(backup, original);
          if (!privateSnap.exists || measured) tx.set(privateRef, current);
          if (publicDoc) tx.set(record.ref, publicDoc); else tx.delete(record.ref);
        });
      }
    }
    report.collections[kind] = { total: snap.size, published, hidden };
  }
  // Preserve the old ranking index privately; everyone starts opted out.
  if (apply) await base.collection('security_backups').doc(stamp).set({ migratedAt: new Date(), schema: 2, report });
  return report;
}
if (process.argv[1]?.endsWith('migrate-security.mjs')) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT must be supplied privately');
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const durationFile = process.argv.find((arg) => arg.startsWith('--durations='))?.slice(12);
  const durations = durationFile ? JSON.parse(await readFile(durationFile, 'utf8')) : [];
  console.log(JSON.stringify(await migrateSecurity(getFirestore(), process.argv.includes('--apply'), durations), null, 2));
}
