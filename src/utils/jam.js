// src/utils/jam.js
// Jam: one listener hosts, anyone with the link listens along to the same track at the same moment.
// The host writes a small state document; guests subscribe to it and follow.
import { deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

export const JAM_HEARTBEAT_MS = 20000;
// A guest only seeks when it drifts this far from the host, so small network jitter never stutters playback.
export const JAM_DRIFT_SECONDS = 2.5;
// No word from the host for this long while "playing" means the host left without ending the Jam.
export const JAM_STALE_MS = 90000;

const jamRef = (db, appId, id) => doc(db, 'artifacts', appId, 'jams', id);
export const validJamId = (id) => typeof id === 'string' && /^[A-Za-z0-9]{10,24}$/.test(id);

export function newJamId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', bytes = crypto.getRandomValues(new Uint8Array(14));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

export const jamLink = (id) => `${window.location.origin}/jam/${id}`;

const snapshot = (audio, track, queue) => ({
  trackId: track?.id || '',
  queueIds: (queue || []).slice(0, 200).map((t) => t.id),
  positionSec: Math.max(0, Math.round((audio?.currentTime || 0) * 10) / 10),
  playing: Boolean(audio && !audio.paused),
  updatedAt: serverTimestamp(),
});

export async function createJam(db, appId, { id, hostUid, hostName, audio, track, queue }) {
  await setDoc(jamRef(db, appId, id), {
    ...snapshot(audio, track, queue),
    hostUid,
    hostName: (hostName || 'Listener').slice(0, 40),
    startedAt: Date.now(),
    // For a Firestore TTL policy on `expiresAt`: abandoned Jams clean themselves up.
    expiresAt: Timestamp.fromMillis(Date.now() + 2 * 86400000),
  });
}

export const updateJam = (db, appId, id, { audio, track, queue }) => updateDoc(jamRef(db, appId, id), snapshot(audio, track, queue));

export const endJam = (db, appId, id) => deleteDoc(jamRef(db, appId, id));

export async function readJam(db, appId, id) {
  const snap = await getDoc(jamRef(db, appId, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// A live listener is attached only after one plain read succeeds. A listener that is refused
// (for example before the rules are deployed) can trip an internal Firestore SDK assertion that
// takes every other listener in the app down with it, so a refused read never gets that far.
export function subscribeJam(db, appId, id, onState, onError) {
  let stop = null, cancelled = false;
  readJam(db, appId, id).then((first) => {
    if (cancelled) return;
    onState(first, Date.now());
    if (!first) return;
    stop = onSnapshot(jamRef(db, appId, id), (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      onState(snap.exists() ? { id: snap.id, ...snap.data() } : null, Date.now());
    }, (err) => { stop?.(); stop = null; onError?.(err); });
  }).catch((err) => { if (!cancelled) onError?.(err); });
  return () => { cancelled = true; stop?.(); };
}

// Where the host is right now: the reported position plus the time since the report.
// `offset` corrects for this device's clock being ahead of or behind the server's.
export function expectedPosition(state, now, offset = 0) {
  if (!state) return 0;
  const at = state.updatedAt?.toMillis?.() ?? 0;
  if (!state.playing || !at) return state.positionSec || 0;
  return (state.positionSec || 0) + Math.max(0, (now - offset - at) / 1000);
}
