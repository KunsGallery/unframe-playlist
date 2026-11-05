const TIME_TAG = /\[\d{1,3}:\d{1,2}(?:\.\d{1,3})?\]/g;
const SECTION_MARKER = /^\[[^\]]*\]$/;
const MIN_LINE_MATCH = 0.3;
const SECONDS_PER_CHAR = 0.2;
const FALLBACK_LINE_GAP = 3;
const MIN_WORDS_FOR_CERTAINTY = 8;
const MIN_LANGUAGE_LEAD = 2;

const COMMON_WORDS = {
  english: 'the and you your my me i to of in on is are it that for with we be all love this',
  french: 'le les la des une un et je tu nous vous dans sur pour que qui pas est au du mon ma ton',
  italian: 'il lo la gli le una un e di che non per con nel nella senza sono mi ti si più del della',
  spanish: 'el los las una un y de que en por con para no es mi tu se como pero del lo me',
};
const COMMON_WORD_SETS = Object.fromEntries(Object.entries(COMMON_WORDS).map(([language, words]) => [language, new Set(words.split(' '))]));

const normalize = (text) => text.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '');
const countMatches = (text, pattern) => (text.match(pattern) || []).length;

export function prepareLyrics(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((raw) => {
      const trimmed = raw.trim();
      return SECTION_MARKER.test(trimmed) && !trimmed.match(TIME_TAG) ? '' : trimmed.replace(TIME_TAG, '').trim();
    })
    .filter((line) => normalize(line))
    .map((line) => ({ text: line }));
}

export function detectLanguage(text, fallback) {
  if (fallback) return { language: fallback, certain: true };
  const source = String(text || '');
  const hangul = countMatches(source, /\p{Script=Hangul}/gu);
  const kana = countMatches(source, /[\p{Script=Hiragana}\p{Script=Katakana}]/gu);
  const latin = countMatches(source, /\p{Script=Latin}/gu);
  if (hangul >= kana && hangul >= latin && hangul > 0) return { language: 'korean', certain: true };
  if (kana > 0 && kana >= latin / 2) return { language: 'japanese', certain: true };

  const words = source.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const scores = Object.entries(COMMON_WORD_SETS)
    .map(([language, set]) => [language, words.filter((word) => set.has(word)).length])
    .sort((a, b) => b[1] - a[1]);
  const [[language, top], [, second]] = scores;
  if (!top) return { language: null, certain: false };
  return { language, certain: words.length >= MIN_WORDS_FOR_CERTAINTY && top - second >= MIN_LANGUAGE_LEAD };
}

// Global alignment. Unmatched recognized text before and after the lyrics costs nothing,
// because intros and outros often transcribe as noise. Returns, per lyric char, the matched index or -1.
function alignChars(lyric, heard) {
  const n = lyric.length, m = heard.length, width = m + 1;
  const score = new Int32Array((n + 1) * width);
  const from = new Uint8Array((n + 1) * width);
  const DIAGONAL = 0, UP = 1, LEFT = 2;
  for (let i = 1; i <= n; i++) { score[i * width] = -i; from[i * width] = UP; }
  for (let j = 1; j <= m; j++) from[j] = LEFT;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diagonal = score[(i - 1) * width + j - 1] + (lyric[i - 1] === heard[j - 1] ? 2 : -1);
      const up = score[(i - 1) * width + j] - 1;
      const left = score[i * width + j - 1] - (i === n ? 0 : 1);
      const best = Math.max(diagonal, up, left);
      score[i * width + j] = best;
      from[i * width + j] = best === diagonal ? DIAGONAL : best === up ? UP : LEFT;
    }
  }
  const match = new Int32Array(n).fill(-1);
  for (let i = n, j = m; i > 0 || j > 0;) {
    const step = from[i * width + j];
    if (step === DIAGONAL && i > 0 && j > 0) {
      if (lyric[i - 1] === heard[j - 1]) match[i - 1] = j - 1;
      i--; j--;
    } else if (step === UP && i > 0) i--;
    else j--;
  }
  return match;
}

export function alignLyrics(lines, words) {
  const heard = [], heardTimes = [];
  for (const word of words || []) {
    const chars = [...normalize(word.text || '')];
    const [start, end] = word.timestamp;
    const finish = end ?? start + 0.3;
    chars.forEach((char, k) => { heard.push(char); heardTimes.push(start + (finish - start) * k / chars.length); });
  }

  const lyric = [], owner = [], offset = [];
  lines.forEach((line, index) => {
    [...normalize(line.text)].forEach((char, k) => { lyric.push(char); owner.push(index); offset.push(k); });
  });

  const match = alignChars(lyric, heard);
  const stats = lines.map(() => ({ time: null, matched: 0, total: 0 }));
  let matchedTotal = 0;
  lyric.forEach((_, k) => {
    const stat = stats[owner[k]];
    stat.total++;
    if (match[k] < 0) return;
    stat.matched++; matchedTotal++;
    if (stat.time === null) stat.time = Math.max(0, heardTimes[match[k]] - offset[k] * SECONDS_PER_CHAR);
  });

  const trusted = stats.map((s) => s.time !== null && s.matched / s.total >= MIN_LINE_MATCH);
  const times = stats.map((stat, i) => {
    if (trusted[i]) return stat.time;
    let before = i - 1, after = i + 1;
    while (before >= 0 && !trusted[before]) before--;
    while (after < stats.length && !trusted[after]) after++;
    if (before >= 0 && after < stats.length) return stats[before].time + (stats[after].time - stats[before].time) * (i - before) / (after - before);
    if (before >= 0) return stats[before].time + (i - before) * FALLBACK_LINE_GAP;
    if (after < stats.length) return Math.max(0, stats[after].time - (after - i) * FALLBACK_LINE_GAP);
    return 0;
  });

  let latest = 0;
  return {
    lines: lines.map((line, i) => {
      latest = Math.max(latest, times[i]);
      return { text: line.text, time: latest, matchRate: stats[i].total ? stats[i].matched / stats[i].total : 0, needsReview: !trusted[i] };
    }),
    matchRate: lyric.length ? matchedTotal / lyric.length : 0,
  };
}

export function formatLrcTime(seconds) {
  const hundredths = Math.round(Math.max(0, seconds) * 100);
  const minutes = Math.floor(hundredths / 6000);
  const rest = hundredths - minutes * 6000;
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(rest / 100)).padStart(2, '0')}.${String(rest % 100).padStart(2, '0')}`;
}

export const toLrc = (lines) => lines.map((line) => `[${formatLrcTime(line.time)}] ${line.text}`).join('\n');

// A line someone has placed by hand no longer needs review, and it stays between its neighbours.
function placeLine(lines, index, time) {
  const earliest = index > 0 ? lines[index - 1].time : 0;
  const latest = index < lines.length - 1 ? lines[index + 1].time : Infinity;
  const placed = Math.round(Math.min(latest, Math.max(earliest, time)) * 100) / 100;
  return lines.map((line, i) => (i === index ? { ...line, time: placed, needsReview: false } : line));
}

export const nudgeLine = (lines, index, delta) => placeLine(lines, index, lines[index].time + delta);
