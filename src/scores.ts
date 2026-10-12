import type { Difficulty, Size } from './sudoku';
import type { Game } from './state';

export interface Score { id: string; size: Size; difficulty: Difficulty; elapsed: number; hints: number; achievedAt: number }
const key = 'quiet-sudoku-scores-v1';
export function topScores(scores: Score[], size: Size, difficulty: Difficulty): Score[] {
  return scores.filter(s => s.size === size && s.difficulty === difficulty)
    .sort((a, b) => a.elapsed - b.elapsed || a.achievedAt - b.achievedAt || a.id.localeCompare(b.id)).slice(0, 5);
}
function normalize(scores: Score[]): Score[] {
  const unique = [...new Map(scores.map(s => [s.id, s])).values()];
  return ([4, 6, 9] as Size[]).flatMap(size => (['easy', 'medium', 'hard'] as Difficulty[]).flatMap(d => topScores(unique, size, d)));
}
export function loadScores(): Score[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(data)) return [];
    return normalize(data.filter((s): s is Score => s && typeof s.id === 'string' && /^[\w-]{1,80}$/.test(s.id) &&
      [4, 6, 9].includes(s.size) && ['easy', 'medium', 'hard'].includes(s.difficulty) &&
      Number.isFinite(s.elapsed) && s.elapsed >= 0 && Number.isInteger(s.hints) && s.hints >= 0 &&
      Number.isFinite(s.achievedAt) && s.achievedAt > 0));
  } catch { return []; }
}
export function saveScores(scores: Score[]): boolean {
  try { localStorage.setItem(key, JSON.stringify(normalize(scores))); return true; }
  catch { return false; }
}
export function recordScore(scores: Score[], game: Game, achievedAt = Date.now()): { scores: Score[]; rank: number | null } {
  if (!game.completed || !game.values.every((n, i) => n === game.solution[i])) return { scores, rank: null };
  const updated = normalize([...scores, { id: game.id, size: game.size, difficulty: game.difficulty, elapsed: game.elapsed, hints: game.hints, achievedAt }]
    .filter((s, i, all) => all.findIndex(other => other.id === s.id) === i));
  const index = topScores(updated, game.size, game.difficulty).findIndex(s => s.id === game.id);
  return { scores: updated, rank: index < 0 ? null : index + 1 };
}
