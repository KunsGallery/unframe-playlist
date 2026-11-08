// src/utils/trackSuggestRules.js
// Classification suggestions for the studio: from a track's style prompt and lyrics to UP's own
// vocabulary (genre, moods, time slots, use cases, energy, language, tags).
// Pure functions only: the Netlify function and the browser both import this file.
import {
  TRACK_ENERGY_OPTIONS,
  TRACK_GENRE_OPTIONS,
  TRACK_LANGUAGE_OPTIONS,
  TRACK_MOOD_OPTIONS,
  TRACK_TIME_SLOT_OPTIONS,
  TRACK_USE_CASE_OPTIONS,
} from '../constants/trackCuration.js';

export const SUGGEST_STYLE_MAX = 1000;
export const SUGGEST_LYRICS_MAX = 6000;

const pick = (value, allowed) => (allowed.includes(value) ? value : null);
const pickMany = (values, allowed, max) => [...new Set((Array.isArray(values) ? values : []).filter((v) => allowed.includes(v)))].slice(0, max);

// Anything a model (or a rule) returns is narrowed to values the studio actually offers.
export function cleanSuggestion(raw = {}) {
  const tags = [...new Set((Array.isArray(raw.tags) ? raw.tags : [])
    .filter((t) => typeof t === 'string')
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 24))
    .filter(Boolean))].slice(0, 6);
  const language = pick(raw.language, TRACK_LANGUAGE_OPTIONS) || 'other';
  return {
    genre: pick(raw.genre, TRACK_GENRE_OPTIONS) || 'Ambient',
    moods: pickMany(raw.moods, TRACK_MOOD_OPTIONS, 3),
    timeSlots: pickMany(raw.timeSlots, TRACK_TIME_SLOT_OPTIONS, 2),
    useCases: pickMany(raw.useCases, TRACK_USE_CASE_OPTIONS, 3),
    energy: pick(raw.energy, TRACK_ENERGY_OPTIONS) || 'medium',
    language,
    instrumental: raw.instrumental === true || language === 'instrumental',
    tags,
    reason: typeof raw.reason === 'string' ? raw.reason.trim().slice(0, 200) : '',
  };
}

// Section markers and timestamps are not words of the song.
export const lyricWords = (lyrics = '') => String(lyrics)
  .replace(/\[[^\]]*\]/g, ' ')
  .replace(/\([^)]*\)/g, ' ')
  .trim();

export function detectLanguage(lyrics = '') {
  const text = lyricWords(lyrics);
  if (!text) return 'instrumental';
  const count = (re) => (text.match(re) || []).length;
  const scripts = {
    korean: count(/[가-힣]/g),
    japanese: count(/[぀-ヿ]/g),
    english: count(/[A-Za-z]/g),
  };
  const total = Object.values(scripts).reduce((a, b) => a + b, 0);
  if (!total) return 'other';
  const strong = Object.entries(scripts).filter(([, n]) => n / total >= 0.2);
  if (strong.length > 1) return 'mixed';
  return strong[0]?.[0] || 'other';
}

// Keyword rules: [pattern, effect]. Used when no AI key is set, and as a quick first guess.
const GENRE_RULES = [
  [/lo-?fi|chillhop|boom ?bap chill/i, 'Lo-fi'],
  [/ambient|drone|soundscape|앰비언트/i, 'Ambient'],
  [/jazz|bossa|swing|bebop|재즈/i, 'Jazz'],
  [/soundtrack|cinematic|score|film|ost|영화/i, 'Soundtrack'],
  [/classical|orchestra|string quartet|sonata|baroque|클래식|오케스트라/i, 'Classical'],
  [/hip ?-?hop|rap|trap|힙합|랩/i, 'Hip-Hop'],
  [/r&b|rnb|neo ?soul|soul/i, 'R&B'],
  [/blues|블루스/i, 'Blues'],
  [/rock|grunge|shoegaze|post-?punk|guitar band|록/i, 'Rock'],
  [/electronic|edm|house|techno|synth|idm|garage|일렉/i, 'Electronic'],
  [/experimental|glitch|avant|noise|실험/i, 'Experimental'],
  [/k-?pop|city ?pop|j-?pop|pop|팝|발라드|ballad/i, 'Pop'],
  [/a ?cappella|choir|vocal|보컬|합창/i, 'Vocal'],
];

const MOOD_RULES = [
  [/calm|serene|peaceful|gentle|차분|고요|평온/i, 'calm'],
  [/focus|study|concentrat|minimal|집중/i, 'focused'],
  [/soft|warm|tender|intimate|whisper|부드|따뜻|포근/i, 'soft'],
  [/bright|happy|uplifting|sunny|cheerful|밝|경쾌|설렘/i, 'bright'],
  [/sad|melanchol|lonely|nostalg|longing|heartbreak|tears|슬|외로|그리|눈물|이별/i, 'melancholy'],
  [/dream|ethereal|hazy|floating|reverb|몽환|꿈/i, 'dreamy'],
  [/cinematic|epic|orchestral|grand|웅장|영화/i, 'cinematic'],
  [/energetic|upbeat|driving|dance|powerful|fast|신나|강렬|질주/i, 'energetic'],
  [/rest|sleep|lullaby|relax|healing|휴식|잠|자장가|힐링/i, 'restful'],
];

const TIME_RULES = [
  [/morning|sunrise|아침/i, 'morning'],
  [/afternoon|daylight|오후|한낮/i, 'afternoon'],
  [/evening|sunset|dusk|저녁|노을/i, 'evening'],
  [/night|midnight|moon|밤|자정|달빛/i, 'late-night'],
  [/dawn|새벽/i, 'dawn'],
];

const USE_RULES = [
  [/focus|study|concentrat|집중|공부/i, 'focus'],
  [/writing|journal|글/i, 'writing'],
  [/night ?work|late night work|야근|밤샘/i, 'night-work'],
  [/rest|sleep|relax|healing|휴식|잠|힐링/i, 'rest'],
  [/gallery|museum|exhibition|art|전시|미술관|갤러리/i, 'gallery'],
  [/walk|stroll|wander|산책|걷/i, 'walk'],
  [/opening|intro|overture|오프닝|시작/i, 'opening'],
];

const hits = (rules, text) => [...new Set(rules.filter(([re]) => re.test(text)).map(([, v]) => v))];

export function suggestFromKeywords({ style = '', lyrics = '', title = '', description = '' } = {}) {
  const meta = `${style} ${title} ${description}`;
  const all = `${meta} ${lyricWords(lyrics)}`;
  const saysInstrumental = /instrumental|no vocals?|연주곡|인스트/i.test(style);
  const language = saysInstrumental ? 'instrumental' : detectLanguage(lyrics);
  const bpm = Number((style.match(/(\d{2,3})\s*bpm/i) || [])[1]) || 0;
  const moods = hits(MOOD_RULES, all);
  const energy = bpm >= 120 || moods.includes('energetic') ? 'high'
    : bpm && bpm <= 85 ? 'low'
    : moods.some((m) => ['calm', 'restful', 'soft', 'dreamy'].includes(m)) ? 'low' : 'medium';
  const timeSlots = hits(TIME_RULES, all);
  const useCases = hits(USE_RULES, all);
  if (!useCases.length && energy === 'low') useCases.push('rest');
  const tags = (style.match(/[A-Za-z가-힣][A-Za-z가-힣 &'-]{1,22}/g) || [])
    .map((t) => t.trim().toLowerCase())
    .filter((t) => !/^\d|bpm/.test(t))
    .slice(0, 6);
  return cleanSuggestion({
    genre: hits(GENRE_RULES, meta)[0] || hits(GENRE_RULES, all)[0] || (language === 'instrumental' ? 'Ambient' : 'Pop'),
    moods,
    timeSlots: timeSlots.length ? timeSlots : ['anytime'],
    useCases,
    energy,
    language,
    instrumental: language === 'instrumental',
    tags,
    reason: '스타일과 가사의 낱말로 고른 추천입니다.',
  });
}

// JSON schema handed to the model: every field limited to the studio's own choices.
export const SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    genre: { type: 'string', enum: TRACK_GENRE_OPTIONS },
    moods: { type: 'array', items: { type: 'string', enum: TRACK_MOOD_OPTIONS } },
    timeSlots: { type: 'array', items: { type: 'string', enum: TRACK_TIME_SLOT_OPTIONS } },
    useCases: { type: 'array', items: { type: 'string', enum: TRACK_USE_CASE_OPTIONS } },
    energy: { type: 'string', enum: TRACK_ENERGY_OPTIONS },
    language: { type: 'string', enum: TRACK_LANGUAGE_OPTIONS },
    instrumental: { type: 'boolean' },
    tags: { type: 'array', items: { type: 'string' } },
    reason: { type: 'string' },
  },
  required: ['genre', 'moods', 'timeSlots', 'useCases', 'energy', 'language', 'instrumental', 'tags', 'reason'],
  additionalProperties: false,
};
