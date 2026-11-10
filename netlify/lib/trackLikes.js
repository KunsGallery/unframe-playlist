import { FieldValue } from 'firebase-admin/firestore';
import { root, services } from './server.js';

// How many listeners keep each track in their archive, for the "좋아요 순" sort.
// One server-only document: like events nudge it, a full recount (first catalog build, every
// studio save) puts it right again if a nudge was ever missed.
export const likeStatsRef = () => root().collection('server_stats').doc('track_likes');

// paths: like document paths such as artifacts/APP/users/UID/likes/TRACK.
export function countLikePaths(paths, rootPath) {
  const prefix = `${rootPath}/users/`;
  const counts = {};
  for (const path of paths) {
    if (!path.startsWith(prefix)) continue;
    const parts = path.slice(prefix.length).split('/');
    if (parts.length !== 3 || parts[1] !== 'likes' || !parts[2]) continue;
    counts[parts[2]] = (counts[parts[2]] || 0) + 1;
  }
  return counts;
}

export async function recountLikes() {
  const snap = await services().db.collectionGroup('likes').select().get();
  const counts = countLikePaths(snap.docs.map((doc) => doc.ref.path), root().path);
  await likeStatsRef().set({ counts, countedAt: Date.now() });
  return counts;
}

export async function readLikeCounts() {
  const snap = await likeStatsRef().get();
  // A document made only by like nudges was never fully counted, so count it once.
  return snap.data()?.countedAt ? snap.data().counts || {} : recountLikes();
}

export const likeDelta = (trackId, by) => ({ counts: { [trackId]: FieldValue.increment(by) } });
