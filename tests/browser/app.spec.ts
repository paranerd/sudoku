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
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page.locator('#loading-overlay')).toBeHidden();
  await expect(page.locator('#board .cell')).toHaveCount(size * size);
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
  await page.locator('#idle-toggle').uncheck();
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await page.reload();
  await expect(page.locator('#loading-overlay')).toBeHidden();
  await page.clock.fastForward(121000);
  await expect(page.locator('#hint-card')).toBeHidden();
});
test('installed app shell reloads offline and generates new puzzles offline', async ({ page, context }) => {
  await ready(page);
  await expect(page.locator('#offline-status')).toContainText('Offline bereit');
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
  const time = await page.locator('#timer').textContent();
  await page.clock.fastForward(5000); await expect(page.locator('#timer')).toHaveText(time!);
  await page.reload(); await expect(page.locator('#completion')).toBeVisible();
});
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
  test(`responsive layout ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await ready(page);
    for (const size of [4, 6, 9]) {
      await create(page, size);
      const box = await page.locator('#board').boundingBox();
      expect(Math.abs(box!.width - box!.height)).toBeLessThan(3);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (viewport.width > viewport.height && viewport.height < 620) {
        expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
      }
      await expect(page.locator('#new-button')).toBeVisible();
    }
    await page.screenshot({ path: `test-results/sudoku-${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}
