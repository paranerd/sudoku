import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.locator('#loading-overlay')).toBeHidden();
  await expect(page.locator('#board .cell')).toHaveCount(81);
}
async function create(page: Page, size: number, difficulty = 'hard') {
  await page.getByRole('button', { name: 'Neues Spiel' }).click();
  await page.locator(`input[name=size][value="${size}"]`).check();
  await page.locator(`input[name=difficulty][value="${difficulty}"]`).check();
  await page.getByRole('button', { name: 'Starten', exact: true }).click();
  await expect(page.locator('#loading-overlay')).toBeHidden();
  await expect(page.locator('#board .cell')).toHaveCount(size * size);
}
async function noScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  const dialog = page.locator('dialog[open]');
  if (await dialog.count()) {
    expect(await dialog.evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
  } else {
    for (const selector of ['.header', '.board-wrap', '#number-pad', '.tools', '#new-button']) {
      const el = page.locator(selector);
      if (!await el.isVisible()) continue;
      const box = await el.boundingBox();
      const viewport = page.viewportSize()!;
      expect(box!.y).toBeGreaterThanOrEqual(-1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  }
}
async function solve(page: Page) {
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-v1')!).game);
  for (let i = 0; i < saved.size * saved.size; i++) if (!saved.givens[i]) {
    await page.locator(`[data-index="${i}"]`).click(); await page.keyboard.press(String(saved.solution[i]));
  }
  await expect(page.locator('#completion-dialog')).toBeVisible();
}
test('overlay titles receive initial focus and keyboard controls keep a visible focus ring', async ({ page }) => {
  await ready(page); await page.locator('#settings-button').click();
  await expect(page.locator('#settings-title')).toBeFocused();
  await expect(page.locator('#settings-dialog .icon-button')).not.toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#settings-dialog .icon-button')).toBeFocused();
  expect(await page.locator('#settings-dialog .icon-button').evaluate(el => el.matches(':focus-visible'))).toBe(true);
});
test('highscore overlay shows five times for every difficulty and all sizes', async ({ page }) => {
  await page.addInitScript(() => {
    const scores = [4, 6, 9].flatMap(size => ['easy', 'medium', 'hard'].flatMap(difficulty =>
      Array.from({ length: 5 }, (_, i) => ({ id: `score-${size}-${difficulty}-${i}`, size, difficulty,
        elapsed: size * 60 + i * 10, hints: 0, achievedAt: 1700000000000 + i }))));
    localStorage.setItem('quiet-sudoku-scores-v1', JSON.stringify(scores));
  });
  await ready(page); await page.locator('#scores-button').click();
  for (const size of [4, 6, 9]) {
    await page.locator(`input[name="score-size"][value="${size}"]`).check();
    await expect(page.locator('.score-column h3')).toHaveText(['Leicht', 'Mittel', 'Schwer']);
    await expect(page.locator('.score-column li')).toHaveCount(15);
    for (const column of await page.locator('.score-column').all()) {
      await expect(column.locator('li span')).toHaveText(Array.from({ length: 5 }, (_, i) => `${String(size).padStart(2, '0')}:${String(i * 10).padStart(2, '0')}`));
    }
  }
});
test('mobile 4×4 stays fully visible when viewport height changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await ready(page); await create(page, 4);
  for (const viewport of [{ width: 390, height: 600 }, { width: 844, height: 390 }, { width: 320, height: 480 }, { width: 568, height: 320 }]) {
    await page.setViewportSize(viewport); await noScroll(page);
    await expect.poll(async () => {
      const board = await page.locator('#board').boundingBox();
      const last = await page.locator('#board .cell').last().boundingBox();
      return last!.y + last!.height <= board!.y + board!.height + 1;
    }).toBe(true);
  }
});
test('completion celebration and highscores remain usable on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await ready(page); await create(page, 4, 'easy');
  await solve(page); await noScroll(page);
  await expect(page.locator('#confetti')).toBeVisible();
  await page.screenshot({ path: 'test-results/completion-mobile.png', fullPage: true });
  await page.locator('#result-scores').click(); await noScroll(page);
  await page.locator('#scores-dialog button[aria-label="Schließen"]').click();
  await page.locator('#result-new').click(); await page.getByRole('button', { name: 'Starten', exact: true }).click();
  await expect(page.locator('#loading-overlay')).toBeHidden(); await expect(page.locator('#completion-dialog')).toBeHidden();
});
test('completion respects reduced motion and a slow result does not claim a highscore', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install();
  await page.addInitScript(() => {
    localStorage.setItem('quiet-sudoku-scores-v1', JSON.stringify(Array.from({ length: 5 }, (_, i) =>
      ({ id: `fast-${i}`, size: 4, difficulty: 'easy', elapsed: i + 1, hints: 0, achievedAt: 1700000000000 + i }))));
  });
  await ready(page); await create(page, 4, 'easy'); await page.clock.fastForward(20000); await solve(page);
  await expect(page.locator('#confetti')).toBeHidden(); await expect(page.locator('#record-badge')).toBeHidden();
});
test('numbers, notes, undo, erase, pause, save and all sizes', async ({ page }) => {
  await ready(page);
  const cell = page.locator('.cell.entered').first();
  await cell.click();
  await page.keyboard.press('n');
  await page.keyboard.press('1');
  await expect(cell.locator('.notes')).toContainText('1');
  await page.getByRole('button', { name: 'Letzten Zug rückgängig machen' }).click();
  await expect(cell.locator('.notes')).not.toContainText('1');
  await cell.click(); await page.keyboard.press('n'); await page.keyboard.press('2');
  await expect(cell).toHaveText('2');
  await page.reload(); await expect(cell).toHaveText('2');
  await cell.click(); await page.keyboard.press('Delete'); await expect(cell).not.toHaveText('2');
  await page.getByRole('button', { name: 'Spiel pausieren' }).click();
  await expect(page.locator('#pause-overlay')).toBeVisible();
  const time = await page.locator('#timer').textContent();
  await page.waitForTimeout(1200); await expect(page.locator('#timer')).toHaveText(time!);
  await page.getByRole('button', { name: 'Weiterspielen', exact: true }).last().click();
  await expect(page.locator('#pause-overlay')).toBeHidden();
  for (const size of [4, 6, 9]) { await create(page, size); await expect(page.locator('.number')).toHaveCount(size); }
});
test('new game is beside settings and only replaces the puzzle after confirmation', async ({ page }) => {
  await ready(page);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-v1')!).game);
  await expect(page.locator('.header-actions #new-button')).toBeVisible();
  await expect(page.locator('#new-button')).toHaveText('');
  await expect(page.locator('#new-button svg')).toBeVisible();
  const next = await page.locator('#new-button').boundingBox();
  const settings = await page.locator('#settings-button').boundingBox();
  expect(next!.x + next!.width).toBeLessThanOrEqual(settings!.x);
  await page.getByRole('button', { name: 'Neues Spiel', exact: true }).click();
  await expect(page.locator('#new-description')).toContainText('Möchtest du ein neues Spiel starten?');
  await page.locator('input[name=size][value="4"]').check();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.locator('#new-dialog')).toBeHidden();
  const unchanged = await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-v1')!).game);
  expect(unchanged.givens).toEqual(before.givens);
  expect(unchanged.values).toEqual(before.values);
  await create(page, 4, 'easy');
  await expect(page.locator('#board .cell')).toHaveCount(16);
});
test('manual reveal needs confirmation, cancellation changes nothing and undo restores notes', async ({ page }) => {
  await page.clock.install(); await ready(page);
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-v1')!).game);
  const initial = await state();
  const target = initial.givens.findIndex((n: number) => !n);
  const cell = page.locator(`[data-index="${target}"]`);
  await cell.click(); await page.keyboard.press('n'); await page.keyboard.press('1');
  const before = await state();
  await page.getByRole('button', { name: 'Ein Feld lösen', exact: true }).click();
  await expect(page.locator('#reveal-dialog')).toBeVisible();
  await expect(page.locator('#reveal-description')).toHaveText(`Möchtest du das Feld in Zeile ${Math.floor(target / 9) + 1}, Spalte ${target % 9 + 1} lösen?`);
  const time = await page.locator('#timer').textContent();
  await page.clock.fastForward(5000); await expect(page.locator('#timer')).toHaveText(time!);
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  const canceled = await state();
  expect(canceled.values).toEqual(before.values); expect(canceled.notes).toEqual(before.notes);
  expect(canceled.hints).toBe(0); expect(canceled.history).toEqual(before.history);
  await page.getByRole('button', { name: 'Ein Feld lösen', exact: true }).click();
  await page.keyboard.press('Escape'); await expect(page.locator('#reveal-dialog')).toBeHidden();
  expect((await state()).values).toEqual(before.values);
  await page.getByRole('button', { name: 'Ein Feld lösen', exact: true }).click();
  await page.getByRole('button', { name: 'Feld lösen', exact: true }).click();
  await expect(page.locator('#reveal-dialog')).toBeHidden();
  await expect(cell).toHaveText(String(initial.solution[target]));
  const solved = await state();
  expect(solved.hints).toBe(1); expect(solved.notes[target]).toEqual([]);
  expect(solved.values.filter((_: number, i: number) => i !== target)).toEqual(before.values.filter((_: number, i: number) => i !== target));
  await page.getByRole('button', { name: 'Letzten Zug rückgängig machen' }).click();
  expect((await state()).values).toEqual(before.values); expect((await state()).notes).toEqual(before.notes);
  await page.getByRole('button', { name: 'Spiel pausieren' }).click();
  await expect(page.locator('#reveal-button')).toBeDisabled();
  await page.getByRole('button', { name: 'Weiterspielen', exact: true }).last().click();
  await page.clock.fastForward(300000);
  await expect(page.locator('dialog[open]')).toHaveCount(0); await expect(page.locator('#hint-card')).toHaveCount(0);
});
test('reveal offers an unresolved field when a given is selected and corrects a wrong entry', async ({ page }) => {
  await ready(page); await create(page, 4, 'hard');
  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-v1')!).game);
  const target = initial.givens.findIndex((n: number) => !n);
  const given = initial.givens.findIndex((n: number) => !!n);
  await page.locator(`[data-index="${target}"]`).click();
  await page.keyboard.press(String(initial.solution[target] % 4 + 1));
  await page.locator(`[data-index="${given}"]`).click();
  await page.getByRole('button', { name: 'Ein Feld lösen', exact: true }).click();
  await expect(page.locator('#reveal-description')).toHaveText(`Möchtest du das Feld in Zeile ${Math.floor(target / 4) + 1}, Spalte ${target % 4 + 1} lösen?`);
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.locator(`[data-index="${given}"]`)).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Ein Feld lösen', exact: true }).click();
  await page.getByRole('button', { name: 'Feld lösen', exact: true }).click();
  await expect(page.locator(`[data-index="${target}"]`)).toHaveText(String(initial.solution[target]));
  await page.reload(); await expect(page.locator(`[data-index="${target}"]`)).toHaveText(String(initial.solution[target]));
});
test('conflict and peer highlight settings persist independently', async ({ page }) => {
  await ready(page);
  await expect(page.locator('.cell.related').first()).toBeVisible();
  await page.getByRole('button', { name: 'Einstellungen öffnen' }).click();
  await expect(page.locator('#settings-title')).toHaveText('Einstellungen');
  await expect(page.locator('label[for="conflict-toggle"] strong')).toHaveText('Konflikte markieren');
  await expect(page.getByText('Hilfe bei einer Denkpause')).toHaveCount(0);
  await expect(page.locator('#idle-delay, #idle-toggle')).toHaveCount(0);
  await page.locator('#highlight-toggle').uncheck(); await page.locator('#conflict-toggle').uncheck();
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(page.locator('.cell.related')).toHaveCount(0); await expect(page.locator('.cell.selected')).toHaveCount(1);
  await page.reload(); await expect(page.locator('#loading-overlay')).toBeHidden();
  await page.getByRole('button', { name: 'Einstellungen öffnen' }).click();
  await expect(page.locator('#highlight-toggle')).not.toBeChecked(); await expect(page.locator('#conflict-toggle')).not.toBeChecked();
  await page.locator('#highlight-toggle').check();
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(page.locator('.cell.related').first()).toBeVisible();
});
test('installed app shell reloads offline and generates new puzzles offline', async ({ page, context }) => {
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Einfach mal abschalten.' })).toBeAttached();
  await expect(page.locator('#loading-overlay')).toBeHidden();
  for (const size of [4, 6, 9]) await create(page, size);
  await context.setOffline(false);
});
test('completion validates the whole puzzle and stops the timer', async ({ page }) => {
  await page.clock.install();
  await ready(page); await create(page, 4, 'easy');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-v1')!).game);
  for (let i = 0; i < 16; i++) if (!saved.givens[i]) {
    await page.locator(`[data-index="${i}"]`).click(); await page.keyboard.press(String(saved.solution[i]));
  }
  await expect(page.locator('#completion-dialog')).toBeVisible();
  await noScroll(page);
  const time = await page.locator('#timer').textContent();
  await page.clock.fastForward(5000); await expect(page.locator('#timer')).toHaveText(time!);
  await expect(page.locator('#result-difficulty')).toHaveText('Leicht');
  await expect(page.locator('#result-size')).toHaveText('4 × 4');
  await expect(page.locator('#result-time')).toHaveText(time!);
  await expect(page.locator('#record-badge')).toHaveText('Neuer Highscore · Platz 1');
  await page.reload(); await expect(page.locator('#completion-dialog')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-scores-v1')!).length)).toBe(1);
  await page.locator('#result-scores').click(); await expect(page.locator('#scores-dialog')).toBeVisible();
  await expect(page.locator('.current-score')).toHaveCount(1); await noScroll(page);
  await page.locator('#scores-dialog button[aria-label="Schließen"]').click();
  await expect(page.locator('#completion-dialog')).toBeVisible();
  await page.locator('#result-new').click(); await expect(page.locator('#new-dialog')).toBeVisible();
  await expect(page.locator('#start-button')).toContainText('Starten');
});
for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 600 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 375, height: 667 }, { width: 844, height: 390 }, { width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`responsive layout ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.clock.install(); await page.setViewportSize(viewport); await ready(page);
    await expect(page.locator('.board-footer, .footer, .number-count, .offline-info, .quiet-note')).toHaveCount(0);
    await expect(page.locator('.wordmark')).toHaveText('sudoku.');
    for (const size of [4, 6, 9]) {
      await create(page, size);
      const box = await page.locator('#board').boundingBox();
      expect(Math.abs(box!.width - box!.height)).toBeLessThan(3);
      const lastCell = await page.locator('#board .cell').last().boundingBox();
      expect(lastCell!.y + lastCell!.height).toBeLessThanOrEqual(box!.y + box!.height + 1);
      const heights = await page.locator('#board .cell').evaluateAll(cells => cells.map(c => c.getBoundingClientRect().height));
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await noScroll(page);
      const docked = await page.locator('.tools').evaluate(el => getComputedStyle(el).position === 'fixed');
      if (docked) {
        const toolbar = await page.locator('.tools').boundingBox();
        const pad = await page.locator('#number-pad').boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(toolbar!.y);
        expect(pad!.y + pad!.height).toBeLessThanOrEqual(toolbar!.y);
        expect(await page.locator('.tools').evaluate(el => parseFloat(getComputedStyle(el).paddingBottom))).toBeGreaterThanOrEqual(12);
      }
      await expect(page.locator('#new-button')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Ein Feld lösen', exact: true }).click(); await noScroll(page);
    await expect(page.locator('#reveal-dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    await page.screenshot({ path: `test-results/sudoku-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Einstellungen öffnen' }).click(); await noScroll(page);
    await expect(page.locator('label[for="conflict-toggle"] strong')).toHaveText('Konflikte markieren');
    await expect(page.locator('#idle-delay')).toHaveCount(0);
    await page.screenshot({ path: `test-results/settings-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Tastatur & Spielregeln' }).click(); await expect(page.locator('#help-dialog')).toBeVisible(); await noScroll(page);
    await page.getByRole('button', { name: 'Zurück zu den Einstellungen' }).click();
    await expect(page.locator('#settings-dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
    await page.locator('#scores-button').click(); await noScroll(page);
    await expect(page.locator('.score-column')).toHaveCount(3);
    await expect(page.locator('.score-column li')).toHaveCount(15);
    await page.screenshot({ path: `test-results/scores-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.locator('#scores-dialog button[aria-label="Schließen"]').click();
    await page.getByRole('button', { name: 'Neues Spiel' }).click(); await noScroll(page);
    await expect(page.locator('#new-title')).toHaveText('Neues Spiel');
  });
}
