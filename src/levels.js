// src/levels.js

export const LEVELS = [
  { level: 1,  key: "user",        name: "User",        color: "#004AAD", xpMin: 0,    emoji: "🔵", label: "Electric Blue",  desc: "가입과 동시에 브랜드에 물드는 단계" },
  { level: 2,  key: "newbie",      name: "Newbie",      color: "#1E6BFF", xpMin: 80,   emoji: "🔷", label: "Bright Blue",    desc: "블루가 조금 더 밝아짐" },
  { level: 3,  key: "fan",         name: "Fan",         color: "#2F8CFF", xpMin: 180,  emoji: "🔹", label: "Neon Blue",      desc: "취향이 생기며 블루가 선명해짐" },
  { level: 4,  key: "regular",     name: "Regular",     color: "#3FA9FF", xpMin: 320,  emoji: "🔵", label: "Sky Blue",       desc: "더 자주 머무는 단계" },
  { level: 5,  key: "active",      name: "Active",      color: "#00BFFF", xpMin: 520,  emoji: "🟦", label: "Aqua Blue",      desc: "활동성이 느껴지는 밝은 블루" },
  { level: 6,  key: "maker",       name: "Maker",       color: "#4B5DFF", xpMin: 780,  emoji: "🟪", label: "Indigo",         desc: "창작이 시작되는 구간 (블루 → 보라 전환)" },
  { level: 7,  key: "explorer",    name: "Explorer",    color: "#6C63FF", xpMin: 1100, emoji: "🟣", label: "Violet",         desc: "음악 세계가 넓어지는 단계" },
  { level: 8,  key: "player",      name: "Player",      color: "#FF3CAC", xpMin: 1500, emoji: "🩷", label: "Neon Pink",      desc: "분위기가 살아나는 구간" },
  { level: 9,  key: "listener",    name: "Listener",    color: "#A855F7", xpMin: 2000, emoji: "💜", label: "Purple",         desc: "깊은 몰입과 안정감" },
  { level: 10, key: "advanced",    name: "Advanced",    color: "#FF7A00", xpMin: 2700, emoji: "🟠", label: "Neon Orange",    desc: "확실히 레벨이 올라간 느낌" },
  { level: 11, key: "yourpick",    name: "YourPick",    color: "#FFD600", xpMin: 3600, emoji: "🟡", label: "Warm Yellow",    desc: "자기 취향이 분명해진 단계" },
  { level: 12, key: "leader",      name: "Leader",      color: "#00E676", xpMin: 4700, emoji: "🟢", label: "Neon Green",     desc: "영향력 시작" },
  { level: 13, key: "influencer",  name: "Influencer",  color: "#00F0FF", xpMin: 6100, emoji: "🟦", label: "Cyan Glow",      desc: "파동이 퍼지는 단계" },
  { level: 14, key: "star",        name: "Star",        color: "#FFC400", xpMin: 7800, emoji: "✨", label: "Bright Gold",    desc: "무대 위 조명 같은 존재" },
  { level: 15, key: "trendsetter", name: "Trendsetter", color: "#FF1744", xpMin: 9800, emoji: "🔥", label: "Crimson Neon",   desc: "흐름을 만드는 최상위 단계" },
];

/**
 * xp -> 레벨 정보 계산
 * - 기존 코드와 100% 호환
 * - 추가 필드: emoji, label, desc 도 그대로 포함됨
 */
export function getLevelInfo(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);

  let cur = LEVELS[0];
  for (const l of LEVELS) {
    if (safeXp >= l.xpMin) cur = l;
  }

  const idx = LEVELS.findIndex((l) => l.key === cur.key);
  const isMax = idx === LEVELS.length - 1;
  const next = LEVELS[Math.min(idx + 1, LEVELS.length - 1)];

  const xpMin = cur.xpMin;
  const xpNext = next.xpMin;

  const denom = Math.max(1, xpNext - xpMin);
  const progressPct = isMax ? 100 : Math.min(100, ((safeXp - xpMin) / denom) * 100);

  return {
    ...cur,
    xp: safeXp,
    xpMin,
    xpNext,
    progressPct,
    isMax,
  };
}

/**
 * 레벨 키로 상세 안내 데이터 가져오기(팝업/가이드용)
 */
export function getLevelByKey(key = "user") {
  return LEVELS.find((l) => l.key === key) || LEVELS[0];
}