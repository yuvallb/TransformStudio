import type { Page } from '@playwright/test';

/** Node palette buttons use aria-label "Add {label} node". */
export function addNodeButton(page: Page, label: string) {
  return page.getByRole('button', { name: `Add ${label} node` });
}
