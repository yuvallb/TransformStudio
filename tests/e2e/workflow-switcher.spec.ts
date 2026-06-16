import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe.configure({ mode: 'serial' });

test('Open menu → New workflow clears canvas', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  await page.getByTestId('workflow-switcher-trigger').click();
  await page.getByTestId('demo-item-sales-analysis').click();
  await expect(page.getByText('Loaded demo: Sales analysis')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(4, { timeout: 10000 });

  await page.getByTestId('workflow-switcher-trigger').click();
  await page.getByTestId('new-workflow-item').click();
  await expect(page.getByText('New workflow created')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Start with a demo')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
});

test('Open menu → Demo loads and runs', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  await page.getByTestId('workflow-switcher-trigger').click();
  await page.getByTestId('demo-item-sales-analysis').click();
  await expect(page.getByText('Loaded demo: Sales analysis')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(4, { timeout: 10000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload data file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  const outputNode = page.locator('.react-flow__node').filter({ hasText: 'Output' });
  await expect(outputNode).toContainText('4 rows × 2 cols', { timeout: 180000 });
  await expect(outputNode.locator('.text-emerald-500').first()).toBeVisible({ timeout: 30000 });
});

test('Open menu → Recent shows saved workflow', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  await page.getByTestId('workflow-switcher-trigger').click();
  await page.getByTestId('demo-item-sales-analysis').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(4, { timeout: 10000 });

  await page.getByTestId('workflow-switcher-trigger').click();
  await page.getByTestId('demo-item-customer-join').click();
  await expect(page.getByText('Loaded demo: Customer join')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(5, { timeout: 10000 });

  await page.getByTestId('workflow-switcher-trigger').click();
  const salesRecent = page.locator('[data-testid^="recent-item-"]').filter({ hasText: 'Sales Analysis' });
  await expect(salesRecent).toBeVisible({ timeout: 10000 });
  await salesRecent.click();

  await expect(page.getByText(/Opened: Sales Analysis/i)).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(4, { timeout: 10000 });
});
