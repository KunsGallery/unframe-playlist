import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

const SCORES = ['listenCount', 'shareCount', 'xp', 'likedCount'];

// Prefers the CDN-cached feed; reads Firestore directly only where that feed is unavailable, such as local dev.
export async function fetchRanking(db, appId) {
  try {
    const response = await fetch('/api/ranking', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('ranking feed unavailable');
    const { users } = await response.json();
    if (!Array.isArray(users)) throw new Error('ranking feed malformed');
    return users;
  } catch {
    const board = collection(db, 'artifacts', appId, 'leaderboard');
    const snapshots = await Promise.all(SCORES.map((score) => getDocs(query(board, orderBy(score, 'desc'), limit(30)))));
    const rows = snapshots.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    return [...new Map(rows.map((row) => [row.id, row])).values()];
  }
}
