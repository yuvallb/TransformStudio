import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Versioning tests share IndexedDB — run serially to avoid cross-test interference.
test.describe.configure({ mode: 'serial' });

test('Flow F: save version, edit, and revert', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload data file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await page.getByRole('button', { name: 'Save version' }).click();
  await page.getByPlaceholder('e.g. Added join node').fill('v1 initial');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Version saved')).toBeVisible();

  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });

  await page.getByRole('button', { name: 'History' }).click();
  await page.getByTitle('Revert').first().click();
  await expect(page.getByText('Reverted to selected version')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 10000 });
});

test('Flow F: page reload restores workflow', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload data file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });

  // Wait for debounced autosave (2s) after the Filter node was added
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 10000 });

  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 30000 });
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });
});
