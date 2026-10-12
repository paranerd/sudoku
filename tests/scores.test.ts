import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePuzzle, type Size, type Difficulty } from '../src/sudoku';
import { newGame, load, save, defaults } from '../src/state';
import { loadScores, saveScores, recordScore, topScores, type Score } from '../src/scores';

describe('local highscores', () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value) });
  });
  function completed(elapsed: number, size: Size = 4, difficulty: Difficulty = 'easy') {
    const game = newGame(generatePuzzle(size, difficulty));
    game.values = [...game.solution]; game.completed = true; game.elapsed = elapsed;
    return game;
  }
  it('keeps the five fastest times separately for all nine categories', () => {
    let scores: Score[] = [];
    for (const size of [4, 6, 9] as Size[]) for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      for (const time of [90, 30, 60, 50, 80, 20, 40]) scores = recordScore(scores, completed(time, size, difficulty)).scores;
      expect(topScores(scores, size, difficulty).map(s => s.elapsed)).toEqual([20, 30, 40, 50, 60]);
    }
    expect(scores).toHaveLength(45);
    expect(saveScores(scores)).toBe(true); expect(loadScores()).toEqual(scores);
  });
  it('reports rank for top-five results and no rank for a slower result', () => {
    let scores: Score[] = [];
    for (const n of [10, 20, 30, 40, 50]) scores = recordScore(scores, completed(n)).scores;
    expect(recordScore(scores, completed(25)).rank).toBe(3);
    expect(recordScore(scores, completed(60)).rank).toBeNull();
  });
  it('does not duplicate a recorded game when its result is restored', () => {
    const game = completed(32.5); game.hints = 2;
    const first = recordScore([], game, 1000);
    const second = recordScore(first.scores, game, 2000);
    expect(second.scores).toEqual(first.scores); expect(second.rank).toBe(1);
    expect(second.scores[0].hints).toBe(2);
    game.scoreRecorded = true; game.scoreRank = first.rank;
    save(game, defaults); expect(load().game).toEqual(game);
  });
  it('retains earlier results when times tie', () => {
    let scores: Score[] = [];
    for (let i = 0; i < 5; i++) scores = recordScore(scores, completed(10), 1000 + i).scores;
    expect(recordScore(scores, completed(10), 2000).rank).toBeNull();
  });
  it('rejects incomplete or incorrectly solved games', () => {
    const game = completed(20); game.values[0] = 0;
    expect(recordScore([], game).scores).toEqual([]);
    game.values = [...game.solution]; game.completed = false;
    expect(recordScore([], game).scores).toEqual([]);
  });
  it('recovers from malformed data and handles unavailable storage', () => {
    storage.set('quiet-sudoku-scores-v1', '[{"id":"bad","elapsed":-5}]'); expect(loadScores()).toEqual([]);
    storage.set('quiet-sudoku-scores-v1', '{'); expect(loadScores()).toEqual([]);
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } });
    expect(loadScores()).toEqual([]); expect(saveScores([])).toBe(false);
  });
  it('migrates an old game without losing entries and assigns a stable id', () => {
    const game = completed(45);
    const old = { ...game } as Partial<typeof game>;
    delete old.id; delete old.scoreRecorded; delete old.scoreRank;
    storage.set('quiet-sudoku-v1', JSON.stringify({ game: old, settings: defaults }));
    const restored = load().game!;
    expect(restored.values).toEqual(game.values); expect(restored.elapsed).toBe(45);
    expect(restored.id).toBeTruthy(); expect(restored.scoreRecorded).toBe(false);
    save(restored, defaults); expect(load().game!.id).toBe(restored.id);
  });
});
