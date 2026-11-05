import { root, response, failure, error } from '../lib/server.js';
import { PUBLIC_FEED_HEADERS, docsToRows } from '../lib/publicFeed.js';

const SCORES = ['listenCount', 'shareCount', 'xp', 'likedCount'];

export async function handler(event) {
  try {
    if (event.httpMethod !== 'GET') throw error(405, 'GET 요청만 지원합니다.');
    const board = root().collection('leaderboard');
    const snapshots = await Promise.all(SCORES.map((score) => board.orderBy(score, 'desc').limit(30).get()));
    const users = [...new Map(snapshots.flatMap(docsToRows).map((row) => [row.id, row])).values()];
    return { ...response(200, {}), headers: PUBLIC_FEED_HEADERS, body: JSON.stringify({ users }) };
  } catch (err) { return failure(err); }
}
