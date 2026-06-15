import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Pyodide worker loads on CSV import without console errors', async ({ page }) => {
  test.setTimeout(300000);

  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });
  await expect(page).toHaveTitle(/Transform Studio/);

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload data file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  expect(consoleErrors).toEqual([]);
});

test('Pyodide diagnostics UI runs DataFrame smoke test', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  await page.getByRole('button', { name: 'Help and keyboard shortcuts' }).click();
  await expect(page.getByRole('dialog')).toContainText('Help & shortcuts');

  await page.getByRole('button', { name: 'Test Pyodide' }).click();
  await expect(page.getByRole('dialog', { name: 'Pyodide diagnostics' })).toBeVisible();
  await expect(page.getByText('region')).toBeVisible({ timeout: 180000 });
  await expect(page.getByText('revenue')).toBeVisible();
});
