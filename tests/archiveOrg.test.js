import test from 'node:test';
import assert from 'node:assert/strict';
import { audioFilesFromMetadata, parseArchiveId, parseLength } from '../src/utils/archiveOrg.js';

test('archive.org item ids come from addresses or bare identifiers', () => {
  assert.equal(parseArchiveId('https://archive.org/details/slow-bloom-room'), 'slow-bloom-room');
  assert.equal(parseArchiveId('https://archive.org/download/slow-bloom-room/Slow%20Bloom.wav'), 'slow-bloom-room');
  assert.equal(parseArchiveId('https://ia600608.us.archive.org/6/items/glass-bloom/Glass%20Bloom.wav'), 'glass-bloom');
  assert.equal(parseArchiveId('slow-bloom-room'), 'slow-bloom-room');
  assert.equal(parseArchiveId('https://example.com/details/slow-bloom-room'), null);
  assert.equal(parseArchiveId('two words'), null);
});

test('lengths read as seconds', () => {
  assert.equal(parseLength('245.67'), 245.67);
  assert.equal(parseLength('4:05'), 245);
  assert.equal(parseLength(''), 0);
});

test('only uploaded songs are listed, with their MP3 copy status', () => {
  const files = audioFilesFromMetadata('item', { files: [
    { name: 'B Side.wav', source: 'original', length: '200.5', size: '35000000' },
    { name: 'B Side.mp3', source: 'derivative', format: 'VBR MP3', original: 'B Side.wav' },
    { name: 'A Side.flac', source: 'original', length: '3:10' },
    { name: 'cover.jpg', source: 'original' },
    { name: 'item_meta.xml', source: 'metadata' },
  ] });
  assert.deepEqual(files.map((f) => f.name), ['A Side.flac', 'B Side.wav']);
  assert.equal(files[0].mp3Ready, false);
  assert.equal(files[1].mp3Ready, true);
  assert.equal(files[1].url, 'https://archive.org/download/item/B%20Side.wav');
  assert.equal(files[0].durationSeconds, 190);
});
