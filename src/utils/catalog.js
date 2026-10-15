export const isPublishedTrack = (track) => Boolean(track && !track.isHidden && track.isActive !== false && track.status !== 'draft' && track.audioUrl);
export function resolvePlaylist(playlist, tracks) {
  const map = new Map(tracks.filter(isPublishedTrack).map((track) => [track.id, track]));
  const ids = Array.isArray(playlist.trackIds) ? playlist.trackIds : (playlist.items || []).map((track) => track.id);
  return { ...playlist, items: ids.map((id) => map.get(id)).filter(Boolean) };
}
export function nextQueueIndex(length, index, shuffle, random = Math.random) {
  if (length <= 1) return 0;
  if (!shuffle) return (index + 1) % length;
  const offset = 1 + Math.floor(random() * (length - 1));
  return (index + offset) % length;
}
export function trackUsage(id, playlists = [], slides = []) {
  return [...playlists.filter((p) => (p.trackIds || p.items?.map((t) => t.id) || []).includes(id)).map((p) => p.title), ...slides.filter((s) => s.trackIds?.includes(id)).map((s) => s.title)].filter(Boolean);
}
