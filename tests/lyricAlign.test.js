import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLyrics, detectLanguage, alignLyrics, toLrc, formatLrcTime, nudgeLine, stampLine } from '../src/utils/lyricAlign.js';

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

test('a parenthesized translation does not decide the language', () => {
  const lyrics = '終電の窓に\n(막차 전철 창문에 비친 얼굴을 보며 오래오래 생각했어)\nこんなはず\n(이럴 리 없다고 또 다시 눈을 피했어 정말로 그랬어)';
  assert.equal(detectLanguage(lyrics).language, 'japanese');
});

test('a parenthesized translation is not aligned but stays in the saved lyrics', () => {
  const lines = prepareLyrics('[00:14.37] 終電の窓に\n(막차 전철 창문)\n\n[00:21.89] こんなはず\n(이럴 리 없다)');
  assert.deepEqual(lines.map((l) => l.text), ['終電の窓に', 'こんなはず']);
  const words = [{ text: '終電の窓に', timestamp: [14, 16] }, { text: 'こんなはず', timestamp: [21, 23] }];
  assert.equal(toLrc(alignLyrics(lines, words).lines), '[00:14.00] 終電の窓に\n(막차 전철 창문)\n[00:21.00] こんなはず\n(이럴 리 없다)');
});

test('a sung ad-lib in the same language stays a timed line', () => {
  assert.deepEqual(prepareLyrics('조용한 밤\n(조용히 조용히)\n심장이 뛰어').map((l) => l.text), ['조용한 밤', '(조용히 조용히)', '심장이 뛰어']);
});

test('tap stamp cannot move a line before the previous one', () => {
  const lines = [{ text: 'a', time: 10 }, { text: 'b', time: 20 }];
  assert.equal(stampLine(lines, 1, 5)[1].time, 10);
  assert.equal(stampLine(lines, 1, 15)[1].time, 15);
});

test('a tap later than the next line pushes that line along instead of being refused', () => {
  const lines = [{ text: 'a', time: 10 }, { text: 'b', time: 20 }, { text: 'c', time: 30 }];
  assert.deepEqual(stampLine(lines, 0, 25).map((l) => l.time), [25, 25, 30]);
});

test('section tags with notes and stage directions are not lyrics', () => {
  const text = '[Pre-Chorus] (optional hook)\n[length: 04:36.960]\n(Instrumental breath)\n(피아노 숨)\n[00:10.00] 조용한 밤';
  assert.deepEqual(prepareLyrics(text).map((l) => l.text), ['조용한 밤']);
});
