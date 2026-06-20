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
    expect(screen.getByRole('link', { name: /share refineit on reddit/i })).toHaveAttribute(
      'href',
      expect.stringContaining('reddit.com/submit'),
    );
    expect(screen.getByRole('link', { name: /share refineit via email/i })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:/),
    );
    expect(screen.getByRole('link', { name: /share refineit on whatsapp/i })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me'),
    );
    expect(
      screen.getByRole('button', { name: /copy refineit link for instagram/i }),
    ).toBeInTheDocument();
  }, 15_000);

  it('renders power features section', () => {
    render(<AboutDialog />);
    expect(screen.getByRole('heading', { name: /power features/i })).toBeInTheDocument();
    expect(screen.getByText(/custom python/i)).toBeInTheDocument();
  });

  it('opens from ui store and closes on escape', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(useUiStore.getState().aboutDialogOpen).toBe(false);
  });
});
