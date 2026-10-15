import test from 'node:test';
import assert from 'node:assert/strict';
import { handler as ogHandler } from '../netlify/functions/track-og.js';
import { handler as shareHandler } from '../netlify/functions/track-share.js';
test('Netlify sharing functions load as ESM and reject missing track IDs', async () => {
  for (const handler of [ogHandler, shareHandler]) {
    const response = await handler({ queryStringParameters: {}, path: '/' });
    assert.equal(response.statusCode, 404);
    assert.match(response.headers['Content-Type'], /text\/html/);
  }
});
