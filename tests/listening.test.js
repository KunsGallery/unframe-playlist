import test from 'node:test';
import assert from 'node:assert/strict';
import { creditSeconds, consumeUserQuota, MAX_CREDIT_SECONDS, handler as reward } from '../netlify/functions/reward-event.js';
import { localLimit } from '../netlify/lib/server.js';
import { toPlainData } from '../netlify/lib/publicFeed.js';
import { handler as catalog } from '../netlify/functions/catalog.js';
import { handler as ranking } from '../netlify/functions/ranking.js';
import { Timestamp } from 'firebase-admin/firestore';
import { mediaUrl, withMirroredMedia } from '../src/utils/media.js';
import mediaMirror from '../src/constants/mediaMirror.js';

const NOW = 1_000_000_000;

test('listening credit is bounded by server time, the claim and the single-report cap', () => {
  const session = { lastPulse: NOW - 60_000 };
  assert.equal(creditSeconds(session, 60, NOW), 60);
  assert.equal(creditSeconds(session, 6000, NOW), 60);
  assert.equal(creditSeconds(session, 10, NOW), 10);
  assert.equal(creditSeconds(session, 'bad', NOW), 0);
  assert.equal(creditSeconds({ lastPulse: NOW - 3_600_000 }, 5000, NOW), MAX_CREDIT_SECONDS);
  assert.equal(creditSeconds({ lastPulse: NOW + 5000 }, 10, NOW), 0);
});

test('the per-listener limit lives in the state document and resets after a minute', () => {
  const state = {};
  for (let i = 0; i < 60; i++) consumeUserQuota(state, NOW);
  assert.throws(() => consumeUserQuota(state, NOW), (e) => e.status === 429);
  consumeUserQuota(state, NOW + 60_001);
  assert.equal(state.rate.count, 1);
});

test('the instance limit rejects past its budget and recovers after the window', () => {
  localLimit('test:key', 2, 1000, NOW); localLimit('test:key', 2, 1000, NOW);
  assert.throws(() => localLimit('test:key', 2, 1000, NOW), (e) => e.status === 429);
  localLimit('test:key', 2, 1000, NOW + 1001);
});

test('cached feeds keep timestamps readable through .seconds', () => {
  const plain = toPlainData({ createdAt: new Timestamp(123, 4), nested: [{ at: new Timestamp(5, 0) }], title: 'a', none: null });
  assert.deepEqual(plain, { createdAt: { seconds: 123, nanoseconds: 4 }, nested: [{ at: { seconds: 5, nanoseconds: 0 } }], title: 'a', none: null });
});

test('public feeds accept only GET', async () => {
  for (const handler of [catalog, ranking]) assert.equal((await handler({ httpMethod: 'POST', headers: {} })).statusCode, 405);
});

test('reward events still require a signed-in listener', async () => {
  assert.equal((await reward({ httpMethod: 'POST', headers: {}, body: '{}' })).statusCode, 401);
});

test('mirrored artwork replaces ImgBB URLs for display and nothing else', () => {
  const [source, local] = Object.entries(mediaMirror)[0];
  assert.match(source, /^https:\/\/i\.ibb\.co\//);
  assert.match(local, /^\/media\/[0-9a-f]+\.(jpg|png|webp|avif)$/);
  assert.equal(mediaUrl(source), local);
  assert.equal(mediaUrl('https://i.ibb.co/not-mirrored.jpg'), 'https://i.ibb.co/not-mirrored.jpg');
  const original = { image: source, audioUrl: source, heroSlides: [{ coverImage: source, title: source }] };
  const shown = withMirroredMedia(original);
  assert.equal(shown.image, local); assert.equal(shown.heroSlides[0].coverImage, local);
  assert.equal(shown.audioUrl, source); assert.equal(shown.heroSlides[0].title, source);
  assert.equal(original.image, source, 'stored values stay untouched for the studio');
});
