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
  await page.getByRole('button', { name: 'Neues Spiel starten' }).click();
  await expect(page.locator('#loading-overlay')).toBeHidden();
  await expect(page.locator('#board .cell')).toHaveCount(size * size);
}
async function noScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  const dialog = page.locator('dialog[open]');
  if (await dialog.count()) {
    expect(await dialog.evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
  } else {
    for (const selector of ['.header', '.board-wrap', '#number-pad', '.tools', '#new-button', '#hint-card', '#completion']) {
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
test('idle hint is opt-in per reveal, and settings persist', async ({ page }) => {
  await page.clock.install();
  await ready(page);
  await page.clock.fastForward(61000);
  await expect(page.locator('#hint-card')).toBeVisible();
  const before = await page.locator('.cell.entered').evaluateAll(cells => cells.filter(c => c.textContent?.trim()).length);
  await page.getByRole('button', { name: 'Eine Zahl auflösen' }).click();
  await expect(page.locator('#hint-card')).toBeHidden();
  const after = await page.locator('.cell.entered').evaluateAll(cells => cells.filter(c => c.textContent?.trim()).length);
  expect(after).toBe(before + 1);
  await page.getByRole('button', { name: 'Einstellungen öffnen' }).click();
  await page.locator('#idle-delay').selectOption('0');
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await page.reload();
  await expect(page.locator('#loading-overlay')).toBeHidden();
  await page.clock.fastForward(121000);
  await expect(page.locator('#hint-card')).toBeHidden();
  await page.getByRole('button', { name: 'Einstellungen öffnen' }).click();
  await expect(page.locator('#idle-delay')).toHaveValue('0');
});
test('new settings control hint delay and peer highlighting independently', async ({ page }) => {
  await page.clock.install(); await ready(page);
  await expect(page.locator('.cell.related').first()).toBeVisible();
  await page.getByRole('button', { name: 'Einstellungen öffnen' }).click();
  await expect(page.locator('#settings-title')).toHaveText('Einstellungen');
  await expect(page.locator('#idle-delay option')).toHaveText(['Aus', '30s', '1min', '2min']);
  await expect(page.locator('#idle-toggle')).toHaveCount(0);
  await page.locator('#highlight-toggle').uncheck();
  await page.locator('#idle-delay').selectOption('30');
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(page.locator('.cell.related')).toHaveCount(0);
  await expect(page.locator('.cell.selected')).toHaveCount(1);
  await page.clock.fastForward(31000);
  await expect(page.locator('#hint-card')).toBeVisible();
  await page.reload(); await expect(page.locator('#loading-overlay')).toBeHidden();
  await expect(page.locator('.cell.related')).toHaveCount(0);
  await page.getByRole('button', { name: 'Einstellungen öffnen' }).click();
  await expect(page.locator('#idle-delay')).toHaveValue('30');
  await expect(page.locator('#highlight-toggle')).not.toBeChecked();
  await page.locator('#highlight-toggle').check();
  await page.locator('#idle-delay').selectOption('120');
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(page.locator('.cell.related').first()).toBeVisible();
  await page.clock.runFor(100);
  await page.clock.fastForward(119000); await expect(page.locator('#hint-card')).toBeHidden();
  await page.clock.fastForward(2000); await expect(page.locator('#hint-card')).toBeVisible();
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
  await expect(page.locator('#completion')).toBeVisible();
  await noScroll(page);
  const time = await page.locator('#timer').textContent();
  await page.clock.fastForward(5000); await expect(page.locator('#timer')).toHaveText(time!);
  await page.reload(); await expect(page.locator('#completion')).toBeVisible();
});
for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 600 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 375, height: 667 }, { width: 844, height: 390 }, { width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`responsive layout ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.clock.install(); await page.setViewportSize(viewport); await ready(page);
    await expect(page.locator('.board-footer, .footer, .number-count, .offline-info, .quiet-note')).toHaveCount(0);
    await expect(page.locator('.wordmark')).toHaveText('number place.');
    for (const size of [4, 6, 9]) {
      await create(page, size);
      const box = await page.locator('#board').boundingBox();
      expect(Math.abs(box!.width - box!.height)).toBeLessThan(3);
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
    await page.clock.fastForward(61000); await expect(page.locator('#hint-card')).toBeVisible(); await noScroll(page);
    await page.getByRole('button', { name: 'Hilfsangebot schließen' }).click();
    await page.screenshot({ path: `test-results/sudoku-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Einstellungen öffnen' }).click(); await noScroll(page);
    await expect(page.locator('label[for="idle-delay"] strong')).toHaveText('Hilfe bei einer Denkpause');
    await page.screenshot({ path: `test-results/settings-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Tastatur & Spielregeln' }).click(); await expect(page.locator('#help-dialog')).toBeVisible(); await noScroll(page);
    await page.getByRole('button', { name: 'Zurück zu den Einstellungen' }).click();
    await expect(page.locator('#settings-dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
    await page.getByRole('button', { name: 'Neues Spiel' }).click(); await noScroll(page);
    await expect(page.locator('#new-title')).toHaveText('Neues Spiel');
  });
}
