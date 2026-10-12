import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import type { AddressInfo } from 'node:net';

test.describe('real service worker updates', () => {
  let url: string;
  let version: string;
  let server: ReturnType<typeof createServer>;
  test.beforeEach(async () => {
    version = 'test-original';
    const root = resolve('dist');
    const source = await readFile(resolve(root, 'sw.js'), 'utf8');
    const hash = source.match(/const CACHE = PREFIX \+ '([^']+)'/)![1];
    const types: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
    server = createServer(async (request, response) => {
      try {
        const path = new URL(request.url || '/', 'http://localhost').pathname;
        const file = resolve(root, path === '/sudoku/' ? 'index.html' : path.replace(/^\/sudoku\//, ''));
        if (!file.startsWith(root + sep)) { response.writeHead(404).end(); return; }
        const content = path === '/sudoku/sw.js' ? source.replaceAll(hash, version) : await readFile(file);
        response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        response.end(content);
      } catch { response.writeHead(404).end(); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/sudoku/`;
  });
  test.afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  });
  test('update can be deferred across reloads, applied from settings and announced for the next version', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(url);
    await expect(page.locator('.cell')).toHaveCount(81);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await expect(page.locator('#update-dialog')).toBeHidden();
    const cell = page.locator('.cell.entered').first();
    await cell.click(); await page.keyboard.press('2');
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-v1')!).game);
    await page.evaluate(() => localStorage.setItem('quiet-sudoku-scores-v1', JSON.stringify([
      { id: 'saved-score', size: 4, difficulty: 'easy', elapsed: 20, hints: 0, achievedAt: 1700000000000 },
    ])));
    // A newly installed worker uses a different cache/version but the same test app files.
    version = 'test-update-1';
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
    await expect(page.locator('#update-dialog')).toBeVisible();
    await expect(page.locator('#update-title')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Jetzt aktualisieren', exact: true })).toBeVisible();
    expect(await page.locator('#update-dialog').evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
    await page.getByRole('button', { name: 'Später', exact: true }).click();
    await expect(page.locator('#update-dialog')).toBeHidden();
    await page.reload(); await expect(page.locator('.cell')).toHaveCount(81);
    await expect(page.locator('#update-button')).toBeAttached();
    await page.waitForFunction(() => !document.getElementById('update-button')!.hidden);
    await expect(page.locator('#update-dialog')).toBeHidden();
    await page.locator('#settings-button').click(); await expect(page.locator('#update-button')).toBeVisible();
    await Promise.all([page.waitForEvent('load'), page.locator('#update-button').click()]);
    await expect(page.locator('.cell')).toHaveCount(81);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-v1')!).game);
    expect(after.id).toBe(before.id); expect(after.values).toEqual(before.values);
    await expect(page.locator('#update-button')).toBeHidden(); await expect(page.locator('#update-dialog')).toBeHidden();
    // A separate completed result remains available after activation and reload.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-scores-v1')!).length)).toBe(1);
    version = 'test-update-2';
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
    await expect(page.locator('#update-dialog')).toBeVisible();
    await page.setViewportSize({ width: 568, height: 320 });
    expect(await page.locator('#update-dialog').evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
    await Promise.all([page.waitForEvent('load'), page.locator('#update-now').click()]);
    await expect(page.locator('.cell')).toHaveCount(81); await expect(page.locator('#update-dialog')).toBeHidden();
    expect((await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-sudoku-v1')!).game)).values).toEqual(before.values);
  });
  test('update waits until another overlay closes; Escape defers it', async ({ page }) => {
    await page.goto(url); await expect(page.locator('.cell')).toHaveCount(81);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.locator('#scores-button').click();
    version = 'test-update-3';
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
    await page.waitForFunction(() => !document.getElementById('update-button')!.hidden);
    await expect(page.locator('#scores-dialog')).toBeVisible(); await expect(page.locator('#update-dialog')).toBeHidden();
    await page.locator('#scores-dialog button[aria-label="Schließen"]').click();
    await expect(page.locator('#update-dialog')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.locator('#update-dialog')).toBeHidden();
    await page.reload(); await expect(page.locator('.cell')).toHaveCount(81);
    await page.waitForFunction(() => !document.getElementById('update-button')!.hidden);
    await expect(page.locator('#update-dialog')).toBeHidden();
  });
});
