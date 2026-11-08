// src/utils/recap.js
// UNFRAME year-end recap, built from the monthly listening receipts the server already keeps
// (profile.receipts["YYYY-MM"] = { seconds, plays: { trackId: n }, exhibitions: { name: n }, completed }).

// The first year with real listening data. 2026 is skipped: receipts only began this year.
export const RECAP_FIRST_YEAR = 2027;
// Opens on 1 December and stays until the end of January (Seoul time).
export const RECAP_OPENS = { month: 12, day: 1 };
export const RECAP_CLOSES = { month: 1, day: 31 };

const seoulParts = (date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date).map((p) => [p.type, Number(p.value)]));

// Which year's recap is open on this date, or null.
export function openRecapYear(date = new Date()) {
  const { year, month, day } = seoulParts(date);
  if (month === 12 && day >= RECAP_OPENS.day) return year >= RECAP_FIRST_YEAR ? year : null;
  if (month === 1 && day <= RECAP_CLOSES.day) return year - 1 >= RECAP_FIRST_YEAR ? year - 1 : null;
  return null;
}

// Matches TRACK_MOOD_OPTIONS in constants/trackCuration.js.
const MOOD_LABELS = { calm: '고요한', focused: '집중하는', soft: '부드러운', bright: '밝은', melancholy: '쓸쓸한', dreamy: '몽환적인', cinematic: '영화 같은', energetic: '에너지 넘치는', restful: '쉬어 가는' };
const top = (counts, n = 1) => Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
const add = (into, key, value) => { if (key) into[key] = (into[key] || 0) + value; };

export function buildRecap({ receipts = {}, tracks = [], year }) {
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const plays = {}, exhibitions = {}, moods = {}, genres = {}, months = {};
  let seconds = 0, completed = 0;
  for (const [month, r] of Object.entries(receipts)) {
    if (!month.startsWith(`${year}-`) || !r) continue;
    seconds += Number(r.seconds) || 0;
    completed += Number(r.completed) || 0;
    let monthPlays = 0;
    for (const [id, n] of Object.entries(r.plays || {})) {
      const count = Number(n) || 0;
      add(plays, id, count); monthPlays += count;
      const track = byId.get(id);
      (track?.moods || []).forEach((m) => add(moods, m, count));
      add(genres, track?.genre || track?.tag, count);
    }
    for (const [name, n] of Object.entries(r.exhibitions || {})) add(exhibitions, name, Number(n) || 0);
    months[month] = monthPlays;
  }
  const totalPlays = Object.values(plays).reduce((a, b) => a + b, 0);
  if (!totalPlays && seconds < 60) return null;
  const topTracks = top(plays, 5).map(([id, count]) => ({ track: byId.get(id) || { id, title: '지금은 내려간 곡', artist: '' }, count }));
  const [busiest] = top(months);
  const [mood] = top(moods), [genre] = top(genres), [exhibition] = top(exhibitions);
  return {
    year,
    minutes: Math.round(seconds / 60),
    plays: totalPlays,
    uniqueTracks: Object.keys(plays).length,
    completed,
    topTracks,
    topExhibition: exhibition ? { name: exhibition[0], count: exhibition[1] } : null,
    busiestMonth: busiest ? { month: Number(busiest[0].slice(5, 7)), plays: busiest[1] } : null,
    mood: mood ? (MOOD_LABELS[mood[0]] || mood[0]) : null,
    genre: genre ? genre[0] : null,
  };
}

// A stand-in listener so the page can be previewed before anyone has a year of data.
export function sampleReceipts(tracks, year) {
  const ids = tracks.slice(0, 8).map((t) => t.id), receipts = {};
  for (let m = 1; m <= 12; m++) {
    const plays = {};
    ids.forEach((id, i) => { const n = Math.max(0, ((m * (i + 3)) % 9) - i); if (n) plays[id] = n; });
    receipts[`${year}-${String(m).padStart(2, '0')}`] = { seconds: 2400 + m * 610, plays, exhibitions: { OBLIQUE: m % 4 }, completed: 3 + (m % 5) };
  }
  return receipts;
}
