export const formatTime = (time) => {
  if (isNaN(time)) return "0:00";
  const min = Math.floor(time / 60);
  const sec = Math.floor(time % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
};

export const getDirectLink = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === "") return "";

  if (url.includes("dropbox.com")) {
    return url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace(/\?dl=\d/, "")
      .replace(/&dl=\d/, "");
  }

  return url;
};

// archive.org makes a VBR MP3 (about 7MB) next to every uploaded WAV/FLAC (about 65MB).
// Playback streams that copy; the stored URL keeps the original for archiving and fallback.
const LOSSLESS = /\.(wav|wave|flac|aiff?)$/i;
export const getStreamLink = (url) => {
  const direct = getDirectLink(url);
  try {
    const parsed = new URL(direct);
    if (!/(^|\.)archive\.org$/i.test(parsed.hostname) || !LOSSLESS.test(parsed.pathname)) return direct;
    parsed.pathname = parsed.pathname.replace(LOSSLESS, '.mp3');
    return parsed.toString();
  } catch {
    return direct;
  }
};

// Point the player at a track. If the light copy is missing (an upload archive.org has not
// processed yet), the error handler swaps in the original once via fallbackToOriginal.
export function loadTrackSource(audio, url) {
  const stream = getStreamLink(url), original = getDirectLink(url);
  audio.dataset.original = stream !== original ? original : '';
  audio.src = stream;
  audio.load();
  return stream;
}

export function fallbackToOriginal(audio) {
  const original = audio?.dataset?.original;
  if (!original) return false;
  const position = audio.currentTime || 0, resume = !audio.paused || audio.autoplay || audio.dataset.switching === '1';
  audio.dataset.original = '';
  audio.addEventListener('loadedmetadata', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(position, audio.duration); }, { once: true });
  audio.src = original;
  audio.load();
  if (resume) audio.play().catch(() => {});
  return true;
}

// Media Session: lock screen, notification shade, headphones and car controls.
const session = () => (typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : null);

export function setPlaybackState(state) {
  const ms = session();
  if (!ms) return;
  try { ms.playbackState = state; } catch { /* Not writable everywhere. */ }
}

export function setNowPlaying(track) {
  const ms = session();
  if (!ms || !track || typeof MediaMetadata === 'undefined') return;
  const src = track.image ? new URL(getDirectLink(track.image), window.location.href).href : `${window.location.origin}/icon.png`;
  // No `type`: covers are jpg/webp, and a wrong type makes some browsers drop the artwork.
  const artwork = [96, 192, 256, 384, 512].map((size) => ({ src, sizes: `${size}x${size}` }));
  try {
    ms.metadata = new MediaMetadata({ title: track.title || 'UNFRAME', artist: track.artist || 'UNFRAME', album: track.album || 'UP · UNFRAME PLAYLIST', artwork });
  } catch { /* Optional. */ }
}

export function syncPositionState(audio) {
  const ms = session();
  if (!ms?.setPositionState || !audio) return;
  const duration = audio.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  try {
    ms.setPositionState({ duration, playbackRate: audio.playbackRate || 1, position: Math.min(Math.max(audio.currentTime || 0, 0), duration) });
  } catch { /* Optional. */ }
}

export const waitForImages = async (root) => {
  const imgs = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();

      return new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
    })
  );
};

export const toDataUrl = async (url) => {
  try {
    const res = await fetch(url, { cache: "no-cache" });

    if (!res.ok) throw new Error("fetch failed");

    const blob = await res.blob();

    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

  } catch {
    return null;
  }
};