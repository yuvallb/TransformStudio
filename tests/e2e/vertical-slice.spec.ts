import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  addNodeButton,
  connectSourceToFilter,
  fillFilterExpression,
  selectCanvasNode,
  selectGroupColumns,
} from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('app loads with workspace layout', async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('./');
  await expect(page).toHaveTitle(/Transform Studio/);
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByText('Transform Studio').first()).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('Ready');
  await expect(page.getByText('Node Library')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('Flow A: CSV upload shows preview and profile', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload data file').setInputFiles(salesPath);

  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });
  await expect(page.getByRole('tab', { name: 'Profile' })).toBeVisible();
  await expect(page.getByText('Data Profile')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('profile-column-revenue')).toBeVisible();
  await expect(page.getByTestId('profile-column-status')).toBeVisible();
});

test('Flow A: profile updates when selecting downstream node', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload data file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await addNodeButton(page, 'Filter').click();
  await connectSourceToFilter(page);
  await selectCanvasNode(page, 'Filter');
  await fillFilterExpression(page, 'revenue > 1000');
  await page.waitForTimeout(5000);

  await page.getByRole('tab', { name: 'Profile' }).click();
  await expect(page.getByText('Data Profile')).toBeVisible();
  await expect(page.getByTestId('profile-column-revenue')).toBeVisible();
});

test('vertical slice: CSV → Filter → GroupBy → code → export', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload data file').setInputFiles(salesPath);

  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await addNodeButton(page, 'Filter').click();
  await addNodeButton(page, 'GroupBy').click();
  await addNodeButton(page, 'Output').click();

  await expect(page.locator('.react-flow__node')).toHaveCount(4, { timeout: 10000 });
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Output' })).toBeVisible();

  await page.evaluate(() => {
    const bridge = window.__transformStudioTest;
    const ids = bridge?.getNodeIds() ?? [];
    const source = ids.find((id) => document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes('CSV Source'));
    const filter = ids.find((id) => document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes('Filter'));
    const group = ids.find((id) => document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes('GroupBy'));
    const output = ids.find((id) => document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes('Output'));
    if (source && filter) bridge?.connectNodes(source, filter);
    if (filter && group) bridge?.connectNodes(filter, group);
    if (group && output) bridge?.connectNodes(group, output);
  });

  await selectCanvasNode(page, 'Filter');
  await fillFilterExpression(page, 'revenue > 1000');
  await page.waitForTimeout(4000);

  await selectCanvasNode(page, 'GroupBy');
  await selectGroupColumns(page, 'region');

  await page.waitForTimeout(4000);

  await page.getByRole('tab', { name: 'Code' }).click();
  await page.getByRole('button', { name: 'Show full pipeline code' }).click();
  await expect(page.locator('.cm-content')).toContainText('# GroupBy', { timeout: 10000 });
  await expect(page.locator('.cm-content')).toContainText('.groupby(');
  await expect(page.locator('.cm-content')).toContainText('.eval(');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export code' }).click();
  await page.getByRole('button', { name: 'Python script (.py)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('pipeline.py');
});
