import { countSolutions, type Puzzle } from './sudoku';

export interface Snapshot { values: number[]; notes: number[][] }
export interface Game extends Puzzle, Snapshot { elapsed: number; history: Snapshot[]; completed: boolean; hints: number }
export interface Settings { showConflicts: boolean; highlightPeers: boolean }
export const defaults: Settings = { showConflicts: true, highlightPeers: true };
const key = 'quiet-sudoku-v1';
export function newGame(puzzle: Puzzle): Game {
  return { ...puzzle, values: [...puzzle.givens], notes: puzzle.givens.map(() => []), elapsed: 0, history: [], completed: false, hints: 0 };
}
function validSnapshot(value: unknown, game: Puzzle): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Snapshot;
  const length = game.size * game.size;
  return Array.isArray(s.values) && s.values.length === length && s.values.every((n, i) =>
    Number.isInteger(n) && n >= 0 && n <= game.size && (!game.givens[i] || game.givens[i] === n)) &&
    Array.isArray(s.notes) && s.notes.length === length && s.notes.every(ns => Array.isArray(ns) &&
      ns.every(n => Number.isInteger(n) && n > 0 && n <= game.size));
}
export function load(): { game: Game | null; settings: Settings } {
  let settings = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (!saved) return { game: null, settings };
    settings = {
      showConflicts: typeof saved.settings?.showConflicts === 'boolean' ? saved.settings.showConflicts : defaults.showConflicts,
      highlightPeers: typeof saved.settings?.highlightPeers === 'boolean' ? saved.settings.highlightPeers : defaults.highlightPeers,
    };
    const g = saved.game as Game;
    if (!g || ![4, 6, 9].includes(g.size) || !['easy', 'medium', 'hard'].includes(g.difficulty) ||
      !Array.isArray(g.givens) || g.givens.length !== g.size * g.size ||
      g.givens.some(n => !Number.isInteger(n) || n < 0 || n > g.size) ||
      !Array.isArray(g.solution) || g.solution.length !== g.size * g.size ||
      g.solution.some(n => !Number.isInteger(n) || n < 1 || n > g.size) ||
      countSolutions(g.solution, g.size) !== 1 || !validSnapshot(g, g) ||
      g.givens.some((n, i) => n !== 0 && n !== g.solution[i]) ||
      !Number.isFinite(g.elapsed) || g.elapsed < 0) return { game: null, settings };
    g.history = Array.isArray(g.history) ? g.history.filter(s => validSnapshot(s, g)).slice(-100) : [];
    g.hints = Number.isInteger(g.hints) && g.hints >= 0 ? g.hints : 0;
    g.completed = g.values.every((n, i) => n === g.solution[i]);
    return { game: g, settings };
  } catch { return { game: null, settings }; }
}
export function save(game: Game | null, settings: Settings): boolean {
  try { localStorage.setItem(key, JSON.stringify({ game, settings })); return true; }
  catch { return false; }
}
