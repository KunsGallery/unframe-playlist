import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSuggestion, detectLanguage, suggestFromKeywords } from '../src/utils/trackSuggestRules.js';

test('keeps only values the studio offers', () => {
  const s = cleanSuggestion({ genre: 'Polka', moods: ['calm', 'angry', 'calm', 'soft', 'dreamy', 'bright'], energy: 'extreme', language: 'korean', tags: ['  Rainy Night ', 'rainy night', 3] });
  assert.equal(s.genre, 'Ambient');
  assert.deepEqual(s.moods, ['calm', 'soft', 'dreamy']);
  assert.equal(s.energy, 'medium');
  assert.deepEqual(s.tags, ['rainy night']);
});

test('reads the language from the lyrics, not the section markers', () => {
  assert.equal(detectLanguage('[Verse]\n밤이 오면 너를 생각해'), 'korean');
  assert.equal(detectLanguage('[Chorus]\n(instrumental)'), 'instrumental');
  assert.equal(detectLanguage('I miss you 너무 보고 싶어 오늘 밤'), 'mixed');
});

test('guesses from a style prompt and lyrics', () => {
  const s = suggestFromKeywords({ style: 'lo-fi, warm Rhodes piano, vinyl crackle, 76 bpm, rainy night', lyrics: '[Verse]\n비 오는 밤 혼자 걷는 길\n그리운 너의 목소리' });
  assert.equal(s.genre, 'Lo-fi');
  assert.equal(s.energy, 'low');
  assert.equal(s.language, 'korean');
  assert.ok(s.moods.includes('melancholy'));
  assert.ok(s.timeSlots.includes('late-night'));
  assert.ok(s.useCases.includes('walk'));
});

test('treats an instrumental style as instrumental', () => {
  const s = suggestFromKeywords({ style: 'cinematic orchestral, instrumental, epic strings' });
  assert.equal(s.instrumental, true);
  assert.equal(s.language, 'instrumental');
  assert.equal(s.genre, 'Soundtrack');
});

