import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecap, openRecapYear, sampleReceipts } from '../src/utils/recap.js';

const tracks = [
  { id: 'a', title: 'A', moods: ['calm'], genre: 'Ambient' },
  { id: 'b', title: 'B', moods: ['dreamy', 'calm'], genre: 'Jazz' },
];

test('recap opens in December and January, never for 2026', () => {
  assert.equal(openRecapYear(new Date('2026-12-15T03:00:00Z')), null);
  assert.equal(openRecapYear(new Date('2027-01-10T03:00:00Z')), null);
  assert.equal(openRecapYear(new Date('2027-11-30T03:00:00Z')), null);
  assert.equal(openRecapYear(new Date('2027-12-01T00:30:00Z')), 2027);
  assert.equal(openRecapYear(new Date('2028-01-31T10:00:00Z')), 2027);
  assert.equal(openRecapYear(new Date('2028-02-01T03:00:00Z')), null);
});

test('recap sums only the requested year', () => {
  const recap = buildRecap({ tracks, year: 2027, receipts: {
    '2027-03': { seconds: 600, plays: { a: 3, b: 1 }, exhibitions: { OBLIQUE: 2 }, completed: 2 },
    '2027-04': { seconds: 1200, plays: { b: 5 }, exhibitions: {}, completed: 1 },
    '2026-12': { seconds: 99999, plays: { a: 50 }, completed: 9 },
  } });
  assert.equal(recap.minutes, 30);
  assert.equal(recap.plays, 9);
  assert.equal(recap.completed, 3);
  assert.deepEqual(recap.topTracks.map((t) => [t.track.id, t.count]), [['b', 6], ['a', 3]]);
  assert.deepEqual(recap.busiestMonth, { month: 4, plays: 5 });
  assert.equal(recap.topExhibition.name, 'OBLIQUE');
  assert.equal(recap.mood, '고요한');
  assert.equal(recap.genre, 'Jazz');
});

test('recap is empty without listening, and the sample fills a whole year', () => {
  assert.equal(buildRecap({ tracks, year: 2027, receipts: {} }), null);
  const sample = buildRecap({ tracks, year: 2027, receipts: sampleReceipts(tracks, 2027) });
  assert.ok(sample.plays > 0 && sample.minutes > 0);
});
