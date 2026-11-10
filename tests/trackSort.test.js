import test from 'node:test';
import assert from 'node:assert/strict';
import { sortTracks, releaseTime } from '../src/utils/trackSort.js';
import { countLikePaths } from '../netlify/lib/trackLikes.js';

const tracks = [
  { id: 'a', title: 'Glass Bloom', createdAt: { seconds: 200 }, likeCount: 2 },
  { id: 'b', title: '가을 편지', createdAt: 300000, likeCount: 5 },
  { id: 'c', title: 'Afterglow', publishedAt: '1970-01-01T00:01:40Z' },
];
const ids = (list) => list.map((t) => t.id);

test('reads every stored date shape', () => {
  assert.equal(releaseTime(tracks[0]), 200000);
  assert.equal(releaseTime(tracks[1]), 300000);
  assert.equal(releaseTime(tracks[2]), 100000);
});

test('sorts newest, oldest, by title and by likes', () => {
  assert.deepEqual(ids(sortTracks(tracks)), ['b', 'a', 'c']);
  assert.deepEqual(ids(sortTracks(tracks, 'oldest')), ['c', 'a', 'b']);
  assert.deepEqual(ids(sortTracks(tracks, 'title')), ['b', 'c', 'a']); // 가나다, then A-Z
  assert.deepEqual(ids(sortTracks(tracks, 'likes')), ['b', 'a', 'c']);
  assert.deepEqual(ids(sortTracks(tracks, 'nonsense')), ['b', 'a', 'c']);
});

test('does not change the list it was given', () => {
  const copy = [...tracks];
  sortTracks(tracks, 'title');
  assert.deepEqual(tracks, copy);
});

test('counts likes per track for this app only', () => {
  const root = 'artifacts/up';
  assert.deepEqual(countLikePaths([
    'artifacts/up/users/u1/likes/t1',
    'artifacts/up/users/u2/likes/t1',
    'artifacts/up/users/u2/likes/t2',
    'artifacts/other/users/u3/likes/t1',
    'artifacts/up/users/u4/playlists/t1',
  ], root), { t1: 2, t2: 1 });
});
