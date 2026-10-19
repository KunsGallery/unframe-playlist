export const RADIO_STATIONS = [
  { id: 'opening', title: '문을 여는 음악', description: '공간에 첫 빛이 들어올 때.', tags: ['opening', 'morning', 'bright'], energy: 'medium' },
  { id: 'focus', title: '오래 머무는 음악', description: '작업과 생각 사이, 방해하지 않는 흐름.', tags: ['focus', 'writing', 'focused', 'calm'], energy: 'low' },
  { id: 'closing', title: '문을 닫는 음악', description: '하루의 잔상을 천천히 정리하는 시간.', tags: ['rest', 'late-night', 'restful', 'dreamy'], energy: 'low' },
];
export function radioQueue(tracks, station) {
  const score = (t) => [...(t.moods || []), ...(t.useCases || []), ...(t.timeSlots || [])].filter((tag) => station.tags.includes(tag)).length * 5 + (t.energy === station.energy ? 2 : 0) + (station.id === 'focus' && t.instrumental ? 3 : 0);
  return [...tracks].sort((a, b) => score(b) - score(a) || Number(b.priority || 0) - Number(a.priority || 0) || a.id.localeCompare(b.id));
}
export const exhibitionNames = (tracks) => [...new Set(tracks.map((t) => t.exhibition).filter(Boolean))];
export function journeyQueue(tracks, name) {
  const order = { entrance: 0, artwork: 1, exit: 2 };
  return tracks.filter((t) => t.exhibition === name).sort((a, b) => (order[a.journeyStage] ?? 1) - (order[b.journeyStage] ?? 1) || Number(b.priority || 0) - Number(a.priority || 0));
}
