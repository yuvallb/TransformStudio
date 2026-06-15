import { expect, type Page } from '@playwright/test';

/** Node palette buttons use aria-label "Add {label} node". */
export function addNodeButton(page: Page, label: string) {
  return page.getByRole('button', { name: `Add ${label} node` });
}

export async function selectCanvasNode(page: Page, label: string) {
  const nodeId = await page.evaluate((nodeLabel) => {
    return window.__transformStudioTest?.selectNodeByLabel(nodeLabel) ?? null;
  }, label);
  expect(nodeId).toBeTruthy();
  await page.getByRole('tab', { name: 'Inspector' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Inspector' })).toContainText(label);
}

export async function fillFilterExpression(page: Page, expression: string) {
  await page.getByRole('tab', { name: 'Inspector' }).click();
  const inspector = page.getByRole('tabpanel', { name: 'Inspector' });
  const editor = inspector.locator('.cm-content').first();
  await expect(editor).toBeVisible({ timeout: 10000 });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(expression);
  await editor.blur();
}

export async function selectGroupColumns(page: Page, ...columns: string[]) {
  await page.getByRole('tab', { name: 'Inspector' }).click();
  const inspector = page.getByRole('tabpanel', { name: 'Inspector' });
  await inspector.getByRole('button', { name: 'Select column' }).click();
  for (const column of columns) {
    await inspector.getByRole('button', { name: column, exact: true }).click();
  }
  await page.keyboard.press('Escape');
}

export async function connectSourceToFilter(page: Page) {
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
}
