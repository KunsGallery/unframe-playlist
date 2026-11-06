import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLyrics, detectLanguage, alignLyrics, toLrc, formatLrcTime, nudgeLine, stampLine, promoteNote } from '../src/utils/lyricAlign.js';
import { runWithDeviceFallback, describeSyncError, shouldTryWebGPU } from '../src/utils/lyricDevice.js';

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
  assert.equal(toLrc(alignLyrics(lines, words).lines), '[00:14.00] 終電の窓に\n(막차 전철 창문)\n\n[00:21.00] こんなはず\n(이럴 리 없다)');
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

test('saving keeps section markers, blank lines and stage directions where they were', () => {
  const lines = prepareLyrics('[Verse 1]\n조용한 밤\n\n(Instrumental)\n[Chorus]\n심장이 뛰어\n\n[Outro]');
  assert.deepEqual(lines.map((l) => l.text), ['조용한 밤', '심장이 뛰어']);
  const words = [{ text: '조용한', timestamp: [1, 2] }, { text: '밤', timestamp: [2, 3] }, { text: '심장이', timestamp: [9, 10] }, { text: '뛰어', timestamp: [10, 11] }];
  assert.equal(toLrc(alignLyrics(lines, words).lines), '[Verse 1]\n[00:01.00] 조용한 밤\n\n(Instrumental)\n[Chorus]\n[00:09.00] 심장이 뛰어\n\n[Outro]');
});

test('sung parenthesized lines that merely mention a direction word stay lyrics', () => {
  assert.deepEqual(prepareLyrics('조용한 밤\n(나의 피아노 소리)\n(전주에서 만나)').map((l) => l.text), ['조용한 밤', '(나의 피아노 소리)', '(전주에서 만나)']);
  assert.deepEqual(prepareLyrics('sei la mia voce\n(Solo tu)\n(Just breath)').map((l) => l.text), ['sei la mia voce', '(Solo tu)', '(Just breath)']);
});

test('real stage directions are still not aligned', () => {
  for (const line of ['(Instrumental)', '(Instrumental breath)', '(Instrumental only)', '(피아노 숨)', '(간주)', '(solo)', '(짧은 간주)', '(8–12 bars 간주, 무가사)', '(8–12 bars instrumental, lyric-free)', '(8 bars solo cello or violin, lyric-free)', '(8 bars piano solo, lyrical, no vocals)', '(Instrumental / choir texture)']) assert.deepEqual(prepareLyrics(`조용한 밤\n${line}`).map((l) => l.text), ['조용한 밤']);
});

test('a line with its own time tag is never demoted to a translation', () => {
  assert.deepEqual(prepareLyrics('[00:10.00] 조용한 밤\n[00:12.00] (Oh yeah)').map((l) => l.text), ['조용한 밤', '(Oh yeah)']);
});

test('a kanji-only parenthesized line in a Japanese song stays a lyric', () => {
  assert.deepEqual(prepareLyrics('まだ灯りのある部屋\n(夜明)').map((l) => l.text), ['まだ灯りのある部屋', '(夜明)']);
});

test('a note can be promoted to a sung line that still needs review', () => {
  const lines = [{ text: '조용한 밤', time: 10, note: '(Oh yeah)\n(two)' }, { text: '심장', time: 20 }];
  const next = promoteNote(lines, 0);
  assert.deepEqual(next.map((l) => l.text), ['조용한 밤', '(Oh yeah)', '심장']);
  assert.equal(next[0].note, '(two)');
  assert.equal(next[1].time, 10); assert.equal(next[1].needsReview, true);
});

test('a nudge blocked by a neighbour keeps the line flagged', () => {
  const lines = [{ text: 'a', time: 10 }, { text: 'b', time: 10, needsReview: true }];
  assert.equal(nudgeLine(lines, 1, -1)[1].needsReview, true);
  assert.equal(nudgeLine(lines, 1, 1)[1].needsReview, false);
});

test('WebGPU failure falls back to WASM once', async () => {
  const tried = [];
  const result = await runWithDeviceFallback('webgpu', async (device) => { tried.push(device); if (device === 'webgpu') throw new Error('Session creation failed'); return 'ok'; });
  assert.deepEqual(tried, ['webgpu', 'wasm']); assert.deepEqual(result, { value: 'ok', device: 'wasm' });
});

test('a WASM failure is not retried', async () => {
  let runs = 0;
  await assert.rejects(runWithDeviceFallback('wasm', async () => { runs++; throw new Error('boom'); }));
  assert.equal(runs, 1);
});

test('engine errors become readable causes', () => {
  assert.match(describeSyncError(new Error('Failed to fetch model file')), /모델/);
  assert.match(describeSyncError(new RangeError('Array buffer allocation failed')), /메모리/);
  assert.match(describeSyncError(new Error('unknown thing')), /분석/);
});

test('Firefox skips WebGPU because it is far slower there and never fails over', () => {
  const firefox = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:159.0) Gecko/20100101 Firefox/159.0';
  const chrome = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
  assert.equal(shouldTryWebGPU(undefined, firefox), false);
  assert.equal(shouldTryWebGPU(undefined, chrome), true);
  assert.equal(shouldTryWebGPU('wasm', chrome), false);
});
