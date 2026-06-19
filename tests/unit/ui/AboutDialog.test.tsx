import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { SITE } from '@/lib/site-config';
import { AboutDialog } from '@/ui/AboutDialog';
import { useUiStore } from '@/state/ui-store';

describe('AboutDialog', () => {
  beforeEach(() => {
    useUiStore.setState({ aboutDialogOpen: true });
  });

  it('renders external links with correct hrefs', () => {
    render(<AboutDialog />);

    expect(screen.getByRole('link', { name: /view on github/i })).toHaveAttribute(
      'href',
      SITE.urls.repo,
    );
    expect(screen.getByRole('link', { name: /report an issue/i })).toHaveAttribute(
      'href',
      SITE.urls.issues,
    );
  }, 15_000);

  it('opens from ui store and closes on escape', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(useUiStore.getState().aboutDialogOpen).toBe(false);
  });
});
