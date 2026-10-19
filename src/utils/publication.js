// Explicit public projection: editor history and future private fields never leak.
export const PUBLIC_CONTENT_FIELDS = {
  tracks: 'title artist image description desc tag genre audioUrl lyrics moods timeSlots useCases energy instrumental language tags priority isActive curatorNote album exhibition artworkTitle coverUrl releaseNumber releasedAt producedAt credits version duration durationSeconds createdAt publishedAt journeyStage journeyNote',
  playlists: 'title desc description image trackIds exhibitionTitle curatorNote journeySteps createdAt publishedAt',
  gathering_playlists: 'title desc image youtubeUrl youtubePlaylistId location eventDate memoryPhoto memoryNote createdAt publishedAt',
};
export function publicContent(kind, value) {
  if (!PUBLIC_CONTENT_FIELDS[kind]) throw new Error('Unknown content type');
  const visible = value.status !== 'draft' && value.isPublished !== false && !value.isHidden && !value.trashedAt && value.isActive !== false;
  if (!visible || (kind === 'tracks' && !value.audioUrl)) return null;
  const keys = new Set(PUBLIC_CONTENT_FIELDS[kind].split(' '));
  return { ...Object.fromEntries(Object.entries(value).filter(([key, val]) => keys.has(key) && val !== undefined)), status: 'published', isPublished: true };
}
