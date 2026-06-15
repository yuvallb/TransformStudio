import { expect, test } from '@playwright/test';

test('Pyodide worker loads and footer shows Python ready', async ({ page }) => {
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

  await page.getByRole('button', { name: 'Help and keyboard shortcuts' }).click();
  await page.getByRole('button', { name: 'Test Pyodide' }).click();

  await expect(page.getByRole('contentinfo')).toContainText('Python ready', { timeout: 180000 });
  await expect(page.getByText('2 rows × 2 cols')).toBeVisible({ timeout: 60000 });

  expect(consoleErrors).toEqual([]);
});
