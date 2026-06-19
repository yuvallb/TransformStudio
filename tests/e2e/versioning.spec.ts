import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { addNodeButton, openVersionHistory, saveWorkflowVersion, selectCanvasNode } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Versioning tests share IndexedDB — run serially to avoid cross-test interference.
test.describe.configure({ mode: 'serial' });

test('Flow F: save version, edit, and revert', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload CSV file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await saveWorkflowVersion(page, 'v1 initial');

  await addNodeButton(page, 'Filter').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });

  await openVersionHistory(page);
  await page.getByRole('button', { name: 'Revert to v1 initial' }).click();
  await expect(page.getByText('Reverted to selected version')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 10000 });
});

test('Flow F: page reload restores workflow', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload CSV file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await addNodeButton(page, 'Filter').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });

  // Wait for debounced autosave (2s) after the Filter node was added
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 10000 });

  await page.reload();
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 30000 });
  await selectCanvasNode(page, 'CSV Source');
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });
});

test('Flow F: compare two saved versions', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload CSV file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await saveWorkflowVersion(page, 'compare-v1');

  await addNodeButton(page, 'Filter').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });

  await saveWorkflowVersion(page, 'compare-v2');

  await openVersionHistory(page);

  const v1Row = page.locator('li').filter({ hasText: 'compare-v1' });
  await v1Row.getByRole('button', { name: 'Compare compare-v1 with another version' }).click();
  await v1Row.getByRole('button', { name: 'compare-v2' }).click();

  await expect(page.getByText('Compare mode enabled')).toBeVisible();
  await expect(page.getByText('Comparing: compare-v1 → compare-v2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exit compare mode' })).toBeVisible();
});

test('Flow F: fork creates new workflow from snapshot', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload CSV file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await saveWorkflowVersion(page, 'fork-base');

  await addNodeButton(page, 'Filter').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });

  await saveWorkflowVersion(page, 'fork-current');

  await openVersionHistory(page);

  const baseRow = page.locator('li').filter({ hasText: 'fork-base' });
  await baseRow.getByRole('button', { name: 'Fork from fork-base' }).click();

  await expect(page.getByText('Forked workflow created')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/\(fork\)/)).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 10000 });
});
