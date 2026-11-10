// src/utils/archiveOrg.js
// Studio helper for archive.org: turn an item address (or bare identifier) into the audio
// files inside it, so a curator never has to build download links by hand.
const AUDIO = /\.(wav|wave|flac|aiff?|mp3|m4a|aac|ogg|opus)$/i;
const LOSSLESS = /\.(wav|wave|flac|aiff?)$/i;

export const ARCHIVE_UPLOAD_URL = 'https://archive.org/upload/';

// Accepts https://archive.org/details/ID, /download/ID/file.wav, a storage-node link, or just ID.
export function parseArchiveId(input) {
  const value = String(input || '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!/(^|\.)archive\.org$/i.test(url.hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    // archive.org/details/ID, archive.org/download/ID/…, or a storage node: iaNNN.us.archive.org/NN/items/ID/…
    const at = parts.findIndex((p) => ['details', 'download', 'embed', 'items'].includes(p));
    const id = at >= 0 ? parts[at + 1] : '';
    return /^[A-Za-z0-9._-]{3,100}$/.test(id || '') ? id : null;
  } catch {
    return /^[A-Za-z0-9._-]{3,100}$/.test(value) ? value : null;
  }
}

export const downloadUrl = (id, name) => `https://archive.org/download/${encodeURIComponent(id)}/${name.split('/').map(encodeURIComponent).join('/')}`;

// "245.67" or "4:05" or "1:02:03" → seconds.
export function parseLength(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parts = String(value).split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  return Math.round(parts.reduce((total, n) => total * 60 + n, 0) * 100) / 100;
}

// The uploaded songs in an item: originals only, each marked with whether archive.org has
// already made the light MP3 copy the player streams.
export function audioFilesFromMetadata(id, metadata) {
  const files = Array.isArray(metadata?.files) ? metadata.files : [];
  const mp3Of = new Set(files.filter((f) => f.source === 'derivative' && /mp3/i.test(f.format || '')).map((f) => f.original));
  return files
    .filter((f) => f.source === 'original' && AUDIO.test(f.name || ''))
    .map((f) => {
      const lossless = LOSSLESS.test(f.name);
      return {
        name: f.name,
        url: downloadUrl(id, f.name),
        durationSeconds: parseLength(f.length),
        sizeMB: Math.round((Number(f.size) || 0) / 100000) / 10,
        lossless,
        mp3Ready: !lossless || mp3Of.has(f.name),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
}

const first = (value) => (Array.isArray(value) ? value[0] : value) || '';

export async function fetchArchiveItem(id, { signal } = {}) {
  const r = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, { signal });
  if (!r.ok) throw new Error('archive.org에 닿지 못했습니다. 잠시 후 다시 시도해 주세요.');
  const data = await r.json();
  if (!data || !data.metadata) throw new Error('이 아이템을 찾지 못했습니다. 주소나 식별자를 확인해 주세요. 막 올렸다면 1~2분 뒤에 다시 시도해 주세요.');
  const files = audioFilesFromMetadata(id, data);
  if (!files.length) throw new Error('이 아이템에 음원 파일이 아직 없습니다. 업로드가 끝났는지 확인해 주세요.');
  return {
    id,
    title: String(first(data.metadata.title)).trim(),
    artist: String(first(data.metadata.creator)).trim(),
    image: `https://archive.org/services/img/${encodeURIComponent(id)}`,
    files,
  };
}
