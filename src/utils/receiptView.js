// src/utils/receiptView.js
// Turns a month of the listener's server receipt into what the receipt card prints.
export const seoulMonth = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).format(date);
const seoulDate = (time) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time).replaceAll('-', '.');
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const monthLabel = (month) => `${month.slice(0, 4)}. ${month.slice(5, 7)} (${MONTH_NAMES[Number(month.slice(5, 7)) - 1] || ''})`;

export function receiptMonths(receipts = {}, now = new Date()) {
  return [...new Set([seoulMonth(now), ...Object.keys(receipts)])].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort().reverse();
}

export function formatListening(seconds = 0) {
  const minutes = Math.floor((Number(seconds) || 0) / 60);
  if (minutes < 60) return `${minutes}분`;
  return `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}`;
}

// A stable, meaningless code per listener and month: the uid itself never appears.
export function receiptCode(uid = '', month = '') {
  let h = 2166136261;
  for (const ch of `${uid}:${month}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const digits = String(h).padStart(10, '0').slice(-8);
  return `UP-${month.replace('-', '')}-${digits.slice(0, 4)}-${digits.slice(4)}`;
}

// Bar widths (1–4px) drawn from the code, so the barcode matches the number under it.
export const barcodeBars = (code) => [...code.replace(/\D/g, '')].flatMap((d) => [1 + (Number(d) % 4), 1 + ((Number(d) * 7) % 3)]);

export function buildReceipt(receipt, { month, tracks = [], uid = '', now = new Date() } = {}) {
  const plays = Object.entries(receipt?.plays || {});
  const titleOf = (id) => tracks.find((t) => t.id === id)?.title || '보관된 음원';
  const isCurrent = month === seoulMonth(now);
  const [y, m] = month.split('-').map(Number);
  const issued = isCurrent ? now : new Date(Date.UTC(y, m, 0, 3));
  return {
    month,
    empty: !receipt,
    issued: seoulDate(issued),
    since: receipt?.since ? seoulDate(receipt.since) : '',
    trackCount: plays.length,
    playStarts: plays.reduce((n, [, c]) => n + c, 0),
    listening: formatListening(receipt?.seconds),
    completed: receipt?.completed || 0,
    topTracks: plays.filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count], i) => ({ id, rank: String(i + 1).padStart(2, '0'), title: titleOf(id), count })),
    exhibitions: Object.entries(receipt?.exhibitions || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    code: receiptCode(uid, month),
  };
}
