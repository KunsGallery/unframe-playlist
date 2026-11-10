import test from 'node:test';
import assert from 'node:assert/strict';
import { expectedPosition, syncStep } from '../src/utils/jam.js';

test('a guest close to the host glides back instead of jumping', () => {
  assert.deepEqual(syncStep(0.04), { rate: 1 });
  assert.equal(syncStep(0.5).rate, 1.06);
  assert.equal(syncStep(0.1).rate, 1.03);
  assert.equal(syncStep(-0.1).rate, 0.97);
  assert.equal(syncStep(0.5).seekBy, undefined);
});

test('a guest far from the host jumps, aiming past the seek delay', () => {
  const step = syncStep(2, 0.6);
  assert.equal(step.seekBy, 2.6);
  assert.equal(step.rate, 1);
  assert.equal(syncStep(-3, 0.6).seekBy, -2.4);
  assert.equal(syncStep(5, 99).seekBy, 8); // a wild delay estimate is capped
  assert.deepEqual(syncStep(NaN), { rate: 1 });
});

test('the host moment moves on while playing and holds while paused', () => {
  const updatedAt = { toMillis: () => 10_000 };
  assert.equal(expectedPosition({ positionSec: 30, playing: true, updatedAt }, 12_500, 0), 32.5);
  assert.equal(expectedPosition({ positionSec: 30, playing: true, updatedAt }, 13_000, 500), 32.5);
  assert.equal(expectedPosition({ positionSec: 30, playing: false, updatedAt }, 20_000, 0), 30);
});
