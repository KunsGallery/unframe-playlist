import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLyrics, detectLanguage, alignLyrics, toLrc, formatLrcTime, nudgeLine } from '../src/utils/lyricAlign.js';

test('prepareLyrics removes timestamps and section markers', () => {
  assert.deepEqual(prepareLyrics('[Verse 1]\n[00:38.15] 조용한 밤\n\n[00:40.78] 심장이 뛰어').map((l) => l.text), ['조용한 밤', '심장이 뛰어']);
});

test('re-running on timed lyrics does not stack timestamps', () => {
  const words = [{ text: '조용한', timestamp: [10, 11] }, { text: '밤', timestamp: [11, 12] }];
  const lrc = toLrc(alignLyrics(prepareLyrics('[00:01.00] 조용한 밤'), words).lines);
  assert.equal(lrc, '[00:10.00] 조용한 밤');
});

test('detectLanguage reads script, and is unsure about short latin text', () => {
  assert.equal(detectLanguage('조용한 밤의 끝에서').language, 'korean');
  assert.equal(detectLanguage('まだ灯りのある部屋').language, 'japanese');
  assert.equal(detectLanguage('nella stanza senza voce e la sera di me').language, 'italian');
  assert.equal(detectLanguage('la vie').certain, false);
});

test('detectLanguage prefers the language already set on the track', () => {
  assert.deepEqual(detectLanguage('조용한 밤의 끝에서', 'japanese'), { language: 'japanese', certain: true });
});

test('repeated chorus stays in time order', () => {
  const words = ['후렴', '가사', '다른', '줄', '후렴', '가사'].map((text, i) => ({ text, timestamp: [i * 5, i * 5 + 1] }));
  const { lines } = alignLyrics([{ text: '후렴 가사' }, { text: '다른 줄' }, { text: '후렴 가사' }], words);
  assert.deepEqual(lines.map((l) => Math.round(l.time)), [0, 10, 20]);
});

test('unmatched line is interpolated and flagged', () => {
  const words = [{ text: '하나', timestamp: [10, 11] }, { text: '셋', timestamp: [30, 31] }];
  const { lines } = alignLyrics([{ text: '하나' }, { text: '전혀 없는 줄' }, { text: '셋' }], words);
  assert.equal(lines[1].needsReview, true);
  assert.equal(Math.round(lines[1].time), 20);
});

test('no recognized words flags every line without throwing', () => {
  const { lines, matchRate } = alignLyrics([{ text: '가사' }, { text: '둘째' }], []);
  assert.equal(matchRate, 0);
  assert.ok(lines.every((l) => l.needsReview));
});

test('non-Hangul text survives normalization', () => {
  const words = [{ text: 'stanza', timestamp: [3, 4] }, { text: 'よる', timestamp: [8, 9] }];
  assert.ok(alignLyrics([{ text: 'Stanza!' }, { text: 'よる' }], words).lines.every((l) => !l.needsReview));
});

test('format and nudge keep lines ordered', () => {
  assert.equal(formatLrcTime(75.5), '01:15.50');
  const lines = [{ text: 'a', time: 10 }, { text: 'b', time: 10.05 }];
  assert.equal(nudgeLine(lines, 1, -1)[1].time, 10);
});
