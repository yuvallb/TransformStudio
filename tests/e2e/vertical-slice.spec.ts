import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('vertical slice: CSV → Filter → GroupBy → code → export', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload CSV file').setInputFiles(salesPath);

  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('button', { name: 'GroupBy', exact: true }).click();

  await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 10000 });

  await page.evaluate(() => {
    const bridge = window.__transformStudioTest;
    const ids = bridge?.getNodeIds() ?? [];
    const source = ids.find((id) => document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes('CSV Source'));
    const filter = ids.find((id) => document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes('Filter'));
    const group = ids.find((id) => document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes('GroupBy'));
    if (source && filter) bridge?.connectNodes(source, filter);
    if (filter && group) bridge?.connectNodes(filter, group);
  });

  const filterNode = page.locator('.react-flow__node').filter({ hasText: 'Filter' }).first();
  const groupNode = page.locator('.react-flow__node').filter({ hasText: 'GroupBy' });

  await filterNode.click();
  await page.getByPlaceholder(/revenue/).fill('revenue > 1000');

  await page.waitForTimeout(4000);

  await groupNode.click();
  await page.getByPlaceholder('region, country').fill('region');

  await page.waitForTimeout(4000);

  await page.getByRole('tab', { name: 'Code' }).click();
  await page.getByRole('button', { name: 'Full pipeline' }).click();
  await expect(page.locator('.cm-content')).toContainText('# GroupBy', { timeout: 10000 });
  await expect(page.locator('.cm-content')).toContainText('.groupby(');
  await expect(page.locator('.cm-content')).toContainText('.eval(');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('pipeline.py');
});
