import { generatePuzzle, type Size, type Difficulty } from './sudoku';
self.onmessage = (event: MessageEvent<{ size: Size; difficulty: Difficulty }>) => {
  self.postMessage(generatePuzzle(event.data.size, event.data.difficulty));
};
