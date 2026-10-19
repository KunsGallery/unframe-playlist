import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { publicContent } from './publication.js';

// A bounded revision list lives with each content document, preserving existing paths.
export async function saveContent(db, ref, payload, actor = '', replace = false) {
  const segments = ref.path.split('/');
  const kind = segments[4], id = segments[5];
  const privateRef = doc(db, 'artifacts', segments[1], 'editorial', 'data', kind, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(privateRef);
    const legacy = snap.exists() ? null : await tx.get(ref);
    const previous = snap.exists() ? snap.data() : legacy?.data();
    const { revisionHistory: history = [], ...old } = previous || {};
    const { revisionHistory: _ignored, id: _id, ...clean } = payload;
    void _ignored; void _id;
    const next = { ...(replace ? {} : old), ...clean, updatedAt: Timestamp.now(), updatedBy: actor };
    if (publicContent(kind, next) && (!previous || !publicContent(kind, previous))) next.publishedAt = Timestamp.now();
    next.revisionHistory = previous ? [...history.slice(-4), { savedAt: Timestamp.now(), actor, data: old }] : [];
    tx.set(privateRef, next);
    const published = publicContent(kind, next);
    if (published) tx.set(ref, published); else tx.delete(ref);
  });
}
