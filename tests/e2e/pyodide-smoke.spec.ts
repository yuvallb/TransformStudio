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
  await expect(page).toHaveTitle(/Transform Studio/);

  await expect(page.getByRole('contentinfo')).toContainText('Python ready', { timeout: 180000 });

  expect(consoleErrors).toEqual([]);
});
