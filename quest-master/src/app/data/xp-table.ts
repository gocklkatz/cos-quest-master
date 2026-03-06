/** XP required to reach each level. Index = level - 1. */
export const XP_TABLE: readonly number[] = [
  0,     // Level 1
  50,    // Level 2
  120,   // Level 3
  200,   // Level 4
  350,   // Level 5
  500,   // Level 6
  750,   // Level 7
  1200,  // Level 8
  1500,  // Level 9
  1900,  // Level 10
  2400,  // Level 11
  3000,  // Level 12
  3700,  // Level 13
  4500,  // Level 14
  5000,  // Level 15 (MAX)
];

export const MAX_LEVEL = XP_TABLE.length;

/** Return the level (1-based) for a given XP total. */
export function calcLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_TABLE.length; i++) {
    if (xp >= XP_TABLE[i]) level = i + 1;
    else break;
  }
  return level;
}

/** XP threshold for the start of a given level (1-based). */
export function xpForLevel(level: number): number {
  return XP_TABLE[level - 1] ?? 0;
}

/** XP threshold for the next level (returns last threshold if at max). */
export function xpForNextLevel(level: number): number {
  return XP_TABLE[level] ?? XP_TABLE[XP_TABLE.length - 1];
}

/** Progress percentage (0–100) within the current level. */
export function levelProgress(xp: number): number {
  const level = calcLevel(xp);
  const current = xp - xpForLevel(level);
  const total = xpForNextLevel(level) - xpForLevel(level);
  return total > 0 ? Math.min(100, (current / total) * 100) : 100;
}
