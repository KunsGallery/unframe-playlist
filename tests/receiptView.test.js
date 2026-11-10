import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceipt, receiptCode, barcodeBars, formatListening, receiptMonths, monthLabel } from '../src/utils/receiptView.js';
import { pickCommunityPlaylists } from '../netlify/functions/community-playlists.js';

const now = new Date('2026-11-10T03:00:00Z');

test('prints a month from the server receipt', () => {
  const r = buildReceipt({ since: Date.parse('2026-11-05T01:00:00Z'), seconds: 1000, completed: 2, plays: { a: 4, b: 1, c: 2 }, exhibitions: { Oblique: 3, Salon: 5 } }, { month: '2026-11', tracks: [{ id: 'a', title: 'Glass Curve' }], uid: 'u1', now });
  assert.equal(r.trackCount, 3);
  assert.equal(r.playStarts, 7);
  assert.equal(r.listening, '16분');
  assert.equal(r.issued, '2026.11.10');
  assert.equal(r.since, '2026.11.05');
  assert.deepEqual(r.topTracks.map((t) => [t.rank, t.title, t.count]), [['01', 'Glass Curve', 4], ['02', '보관된 음원', 2]]);
  assert.deepEqual(r.exhibitions.map((e) => e.name), ['Salon', 'Oblique']);
});

test('a past month is issued on its last day; an empty month says so', () => {
  const r = buildReceipt(undefined, { month: '2026-09', uid: 'u1', now });
  assert.equal(r.empty, true);
  assert.equal(r.issued, '2026.09.30');
});

test('code and barcode are stable and hide the uid', () => {
  assert.equal(receiptCode('u1', '2026-11'), receiptCode('u1', '2026-11'));
  assert.notEqual(receiptCode('u1', '2026-11'), receiptCode('u2', '2026-11'));
  assert.match(receiptCode('u1', '2026-11'), /^UP-202611-\d{4}-\d{4}$/);
  assert.ok(!receiptCode('secret-uid', '2026-11').includes('secret'));
  assert.ok(barcodeBars(receiptCode('u1', '2026-11')).every((w) => w >= 1 && w <= 4));
});

test('formats time, months and labels', () => {
  assert.equal(formatListening(272 * 60), '4시간 32분');
  assert.equal(formatListening(120 * 60), '2시간');
  assert.deepEqual(receiptMonths({ '2026-09': {}, '2026-10': {} }, now), ['2026-11', '2026-10', '2026-09']);
  assert.equal(monthLabel('2026-11'), '2026. 11 (NOV)');
});

test('recommends only shared playlists whose owner allows it', () => {
  const docs = [
    { id: 'p1', data: { title: 'Old', trackIds: ['a'], updatedAt: 1 } },
    { id: 'p2', data: { title: 'Hidden', trackIds: ['a'], updatedAt: 9, discoverable: false } },
    { id: 'p3', data: { title: 'New', trackIds: ['a', 'b'], updatedAt: 5, discoverable: true } },
    { id: 'p4', data: { title: 'Empty', trackIds: [], updatedAt: 7 } },
  ];
  const picked = pickCommunityPlaylists(docs);
  assert.deepEqual(picked.map((p) => p.publicId), ['p3', 'p1']);
  assert.deepEqual(Object.keys(picked[0]).sort(), ['description', 'publicId', 'title', 'trackIds', 'updatedAt']);
});
