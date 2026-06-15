import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Flow D: parameterized filter re-runs with new value', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload data file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await page.getByRole('button', { name: 'Filter', exact: true }).click();

  await page.evaluate(() => {
    const bridge = window.__transformStudioTest;
    const ids = bridge?.getNodeIds() ?? [];
    const source = ids.find((id) =>
      document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes('CSV Source'),
    );
    const filter = ids.find((id) =>
      document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes('Filter'),
    );
    if (source && filter) bridge?.connectNodes(source, filter);
  });

  const filterNode = page.locator('.react-flow__node').filter({ hasText: 'Filter' }).first();
  await filterNode.click();
  await page.getByPlaceholder(/revenue/).fill('df["country"] == {country}');

  await page.getByRole('button', { name: 'Add parameter' }).click();
  await page.getByPlaceholder('country').fill('country');
  await page.getByLabel('country value').fill('US');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await page.waitForTimeout(8000);

  const footer = page.getByRole('contentinfo');
  const usFooterText = await footer.textContent();
  expect(usFooterText).toMatch(/\d+ rows/);

  await page.getByRole('button', { name: 'Run with parameters' }).click();
  await page.getByRole('dialog').getByLabel('country value').fill('UK');
  await page.getByRole('button', { name: 'Run', exact: true }).click();

  await page.waitForTimeout(8000);

  const ukFooterText = await footer.textContent();
  expect(ukFooterText).toMatch(/\d+ rows/);
  expect(ukFooterText).not.toBe(usFooterText);

  await page.getByRole('tab', { name: 'Code' }).click();
  await page.getByRole('button', { name: 'Full pipeline' }).click();
  await expect(page.locator('.cm-content')).toContainText("params['country']", { timeout: 10000 });
});
