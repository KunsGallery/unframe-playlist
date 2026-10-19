import test from 'node:test';
import assert from 'node:assert/strict';
import { publicContent } from '../src/utils/publication.js';
import { radioQueue, RADIO_STATIONS, journeyQueue } from '../src/utils/listening.js';
import { durationSeconds, handler as reward } from '../netlify/functions/reward-event.js';
import { imageType, handler as upload } from '../netlify/functions/upload-image.js';
import { handler as library } from '../netlify/functions/listener-library.js';
import { jsonBody } from '../netlify/lib/server.js';
test('invalid JSON and scalar request bodies are rejected as bad requests', () => { for (const body of ['{', 'null', '[]', '1']) assert.throws(() => jsonBody({ body }), (e) => e.status === 400); });
test('public projection strips all editor and unknown fields', () => {
  const result = publicContent('tracks', { title: 'a', audioUrl: 'https://example.com/a.mp3', revisionHistory: [{ data: { secret: 'draft' } }], updatedBy: 'staff-id', newPrivateField: 'private' });
  assert.deepEqual(Object.keys(result).sort(), ['audioUrl', 'isPublished', 'status', 'title']);
});
test('draft, inactive and trash documents never get a public projection', () => {
  for (const flags of [{ status: 'draft' }, { isPublished: false }, { isHidden: true }, { trashedAt: 1 }, { isActive: false }]) assert.equal(publicContent('tracks', { title: 'a', audioUrl: 'https://example.com/a', ...flags }), null);
});
test('radio only reorders issued tracks and focus respects curation', () => {
  const tracks = [{ id: 'a', energy: 'high' }, { id: 'b', useCases: ['focus'], energy: 'low', instrumental: true }];
  assert.deepEqual(radioQueue(tracks, RADIO_STATIONS[1]).map((t) => t.id), ['b', 'a']); assert.equal(tracks[0].id, 'a');
});
test('exhibition journeys sort entrance/artwork/exit with unspecified works in the middle', () => {
  const tracks = [{ id: 'out', exhibition: 'show', journeyStage: 'exit' }, { id: 'work', exhibition: 'show' }, { id: 'in', exhibition: 'show', journeyStage: 'entrance' }, { id: 'other', exhibition: 'other' }];
  assert.deepEqual(journeyQueue(tracks, 'show').map((t) => t.id), ['in', 'work', 'out']);
});
test('upload checks file signatures, never accepts SVG/HTML', () => {
  assert.equal(imageType(Buffer.from('<svg onload="alert(1)">')), null); assert.equal(imageType(Buffer.from('89504e470d0a1a0a', 'hex')), 'image/png');
});
test('completion duration comes from catalog; unknown lengths are never guessed', () => { assert.equal(durationSeconds({ duration: '2:30' }), 150); assert.equal(durationSeconds({ durationSeconds: 120 }), 120); assert.equal(durationSeconds({}), null); });
test('mutating server endpoints reject unauthenticated calls before touching data', async () => {
  for (const handler of [reward, upload, library]) {
    assert.equal((await handler({ httpMethod: 'GET', headers: {}, body: '{}' })).statusCode, 405);
    assert.equal((await handler({ httpMethod: 'POST', headers: {}, body: '{}' })).statusCode, 401);
    assert.equal((await handler({ httpMethod: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' })).statusCode, 403);
  }
});
