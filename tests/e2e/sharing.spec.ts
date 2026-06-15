import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { addNodeButton, connectSourceToFilter, fillFilterExpression, selectCanvasNode } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Flow C: share workflow, restore in new context, upload and run', async ({ browser }) => {
  test.setTimeout(300000);

  const salesPath = path.resolve(__dirname, '../fixtures/sales.csv');

  const sourceContext = await browser.newContext();
  const sourcePage = await sourceContext.newPage();

  await sourcePage.goto('./');
  await expect(sourcePage.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });

  await sourcePage.getByLabel('Upload data file').setInputFiles(salesPath);
  await expect(sourcePage.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await addNodeButton(sourcePage, 'Filter').click();
  await connectSourceToFilter(sourcePage);
  await selectCanvasNode(sourcePage, 'Filter');
  await fillFilterExpression(sourcePage, 'revenue > 1000');
  await expect(sourcePage.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });
  await expect(sourcePage.getByRole('contentinfo')).not.toContainText('Running pipeline', {
    timeout: 60000,
  });

  await sourcePage.getByRole('button', { name: 'Share workflow' }).click();
  await expect(sourcePage.getByRole('dialog')).toContainText('Share workflow');
  await expect(sourcePage.getByText('Preparing share link…')).toBeHidden({ timeout: 30000 });
  await expect(sourcePage.getByRole('button', { name: 'Copy shareable link' })).toBeEnabled({
    timeout: 10000,
  });

  await sourcePage.getByRole('button', { name: 'Copy shareable link' }).click();
  await expect(sourcePage.getByText('Link copied to clipboard')).toBeVisible();

  const shareUrl = sourcePage.url();
  expect(shareUrl).toContain('#w=');

  const recipientContext = await browser.newContext();
  const recipientPage = await recipientContext.newPage();

  await recipientPage.goto(shareUrl);

  await expect(recipientPage.getByText('Restoring workflow…')).toBeHidden({ timeout: 30000 });
  await expect(recipientPage.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });
  await expect(recipientPage.getByText('Import your dataset')).toBeVisible();

  await recipientPage.getByLabel('Upload data file').setInputFiles(salesPath);
  await expect(recipientPage.getByRole('contentinfo')).toContainText(/rows ×/, { timeout: 180000 });

  await sourceContext.close();
  await recipientContext.close();
});
