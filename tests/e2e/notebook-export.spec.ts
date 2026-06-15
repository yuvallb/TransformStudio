import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Flow E: export pipeline as Jupyter notebook', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('./');
  await expect(page.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');
  await page.getByLabel('Upload data file').setInputFiles(salesPath);
  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });

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

  await expect(page.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });
  await expect(page.getByRole('contentinfo')).not.toContainText('Running pipeline', {
    timeout: 60000,
  });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export code' }).click();
  await page.getByRole('button', { name: 'Jupyter notebook (.ipynb)' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.ipynb$/);
});
