import { describe, expect, it, vi, beforeEach } from 'vitest';
import { candidates, countSolutions, conflicts, generatePuzzle, peers, type Size, type Difficulty } from '../src/sudoku';
import { newGame, load, save, defaults } from '../src/state';

function seeded(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const sizes: Size[] = [4, 6, 9];
const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
describe('puzzle generation', () => {
  for (const size of sizes) for (const difficulty of difficulties) {
    it(`${size}×${size} ${difficulty}: valid and uniquely solvable across 8 seeds`, () => {
      for (let seed = 1; seed <= 8; seed++) {
        const p = generatePuzzle(size, difficulty, seeded(seed));
        expect(p.solution).toHaveLength(size * size);
        expect(conflicts(p.solution, size).size).toBe(0);
        expect(countSolutions(p.givens, size)).toBe(1);
        expect(p.givens.every((n, i) => !n || n === p.solution[i])).toBe(true);
        expect(p.givens.filter(Boolean).length).toBeLessThan(size * size);
      }
    }, 20000);
  }
  it.each(sizes)('%i×%i has progressively fewer clues', size => {
    const counts = difficulties.map(d => generatePuzzle(size, d, seeded(123)).givens.filter(Boolean).length);
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
  });
  it('different seeds produce different puzzles', () => {
    expect(generatePuzzle(9, 'medium', seeded(1)).givens).not.toEqual(generatePuzzle(9, 'medium', seeded(2)).givens);
  });
});
describe('rules', () => {
  it('6×6 blocks are 2 rows by 3 columns', () => {
    expect(peers(0, 8, 6)).toBe(true);
    expect(peers(0, 15, 6)).toBe(false);
    expect(peers(0, 19, 6)).toBe(false);
  });
  it('4×4 blocks are 2 rows by 2 columns', () => {
    expect(peers(0, 5, 4)).toBe(true);
    expect(peers(0, 6, 4)).toBe(false);
  });
  it('marks both sides of a conflict and rejects invalid solutions', () => {
    const board = Array(36).fill(0); board[0] = 1; board[8] = 1;
    expect([...conflicts(board, 6)]).toEqual([0, 8]);
    expect(countSolutions(board, 6)).toBe(0);
    expect(candidates(board, 1, 6)).not.toContain(1);
  });
  it('caps non-unique solutions at two', () => { expect(countSolutions(Array(16).fill(0), 4)).toBe(2); });
});
describe('saved games', () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value) });
  });
  it('restores game, notes, timer, settings and undo history', () => {
    const g = newGame(generatePuzzle(6, 'easy', seeded(4)));
    const i = g.givens.findIndex(n => !n);
    g.history.push({ values: [...g.values], notes: g.notes.map(n => [...n]) });
    g.notes[i] = [1, 4]; g.elapsed = 71.5;
    const settings = { ...defaults, idleHints: false };
    expect(save(g, settings)).toBe(true);
    expect(load()).toEqual({ game: g, settings });
  });
  it('recovers from corrupted JSON', () => {
    storage.set('quiet-sudoku-v1', '{bad');
    expect(load().game).toBeNull();
  });
  it('rejects invalid solution and short givens', () => {
    const g = newGame(generatePuzzle(4, 'easy', seeded(2)));
    g.solution[1] = g.solution[0]; save(g, defaults);
    expect(load().game).toBeNull();
    const next = newGame(generatePuzzle(4, 'easy', seeded(2))); next.givens.pop(); save(next, defaults);
    expect(load().game).toBeNull();
  });
  it('handles blocked local storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } });
    expect(load().game).toBeNull();
    expect(save(null, defaults)).toBe(false);
  });
  it('migrates old hint choices without losing the game or disabled help', () => {
    const game = newGame(generatePuzzle(6, 'medium', seeded(8)));
    storage.set('quiet-sudoku-v1', JSON.stringify({ game, settings: { idleHints: false, idleSeconds: 90, showConflicts: false } }));
    const restored = load();
    expect(restored.game).toEqual(game);
    expect(restored.settings).toEqual({ idleHints: false, idleSeconds: 60, showConflicts: false, highlightPeers: true });
  });
});
