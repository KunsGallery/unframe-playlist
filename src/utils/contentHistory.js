import { runTransaction, Timestamp } from 'firebase/firestore';

// A bounded revision list lives with each content document, preserving existing paths.
export async function saveContent(db, ref, payload, actor = '', replace = false) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref), previous = snap.exists() ? snap.data() : null;
    const history = previous?.revisionHistory || [];
    let revisionHistory = history;
    if (previous) {
      const { revisionHistory: _history, ...data } = previous;
      void _history;
      revisionHistory = [...history.slice(-4), { savedAt: Timestamp.now(), actor, data }];
    }
    tx.set(ref, { ...payload, revisionHistory, updatedAt: Timestamp.now(), updatedBy: actor }, { merge: !replace });
  });
}
