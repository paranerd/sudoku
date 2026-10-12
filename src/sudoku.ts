export type Size = 4 | 6 | 9;
export type Difficulty = 'easy' | 'medium' | 'hard';
export interface Puzzle { size: Size; difficulty: Difficulty; givens: number[]; solution: number[] }

export const blockRows = (size: Size) => size === 9 ? 3 : 2;
export const blockCols = (size: Size) => size === 4 ? 2 : 3;
export function peers(a: number, b: number, size: Size): boolean {
  const ar = Math.floor(a / size), br = Math.floor(b / size);
  return ar === br || a % size === b % size ||
    (Math.floor(ar / blockRows(size)) === Math.floor(br / blockRows(size)) &&
      Math.floor((a % size) / blockCols(size)) === Math.floor((b % size) / blockCols(size)));
}
export function candidates(board: number[], index: number, size: Size): number[] {
  const used = new Set(board.filter((_, other) => other !== index && peers(index, other, size)));
  return Array.from({ length: size }, (_, i) => i + 1).filter(n => !used.has(n));
}
export function countSolutions(input: number[], size: Size, limit = 2): number {
  const board = [...input];
  if (board.length !== size * size || board.some((n, i) => !Number.isInteger(n) || n < 0 || n > size ||
    (n > 0 && board.some((m, j) => i !== j && m === n && peers(i, j, size))))) return 0;
  const search = (): number => {
    let index = -1, options: number[] = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i]) continue;
      const next = candidates(board, i, size);
      if (!next.length) return 0;
      if (index === -1 || next.length < options.length) { index = i; options = next; }
      if (next.length === 1) break;
    }
    if (index === -1) return 1;
    let count = 0;
    for (const value of options) {
      board[index] = value;
      count += search();
      if (count >= limit) break;
    }
    board[index] = 0;
    return Math.min(count, limit);
  };
  return search();
}
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function generatePuzzle(size: Size, difficulty: Difficulty, random = Math.random): Puzzle {
  const height = blockRows(size);
  const width = blockCols(size);
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);
  const rows = shuffle(range(size / height), random).flatMap(b => shuffle(range(height), random).map(r => b * height + r));
  const cols = shuffle(range(size / width), random).flatMap(b => shuffle(range(width), random).map(c => b * width + c));
  const digits = shuffle(range(size).map(i => i + 1), random);
  const solution = rows.flatMap(r => cols.map(c => digits[(r * width + Math.floor(r / height) + c) % size]));
  const target = size === 4 ? { easy: 10, medium: 7, hard: 4 }[difficulty] : size === 6 ? { easy: 22, medium: 18, hard: 14 }[difficulty] : { easy: 42, medium: 34, hard: 27 }[difficulty];
  // Each removed clue is checked: every generated puzzle has exactly one solution.
  let best = [...solution];
  for (let attempt = 0; attempt < 5; attempt++) {
    const givens = [...solution];
    let remaining = givens.length;
    for (const index of shuffle(range(givens.length), random)) {
      const previous = givens[index];
      givens[index] = 0;
      if (countSolutions(givens, size) !== 1) givens[index] = previous;
      else remaining--;
      if (remaining <= target) return { size, difficulty, givens, solution };
    }
    if (remaining < best.filter(Boolean).length) best = givens;
  }
  return { size, difficulty, givens: best, solution };
}
export function conflicts(board: number[], size: Size): Set<number> {
  const result = new Set<number>();
  board.forEach((n, i) => {
    if (n && board.some((m, j) => i !== j && n === m && peers(i, j, size))) result.add(i);
  });
  return result;
}
