import 'fake-indexeddb/auto';

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '@/app/App';
import { db } from '@/data/db';

describe('App', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('renders header, workspace, and footer', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByLabelText('Restoring workflow')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Transform Studio', { selector: 'span.font-semibold' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Node Library')).toBeInTheDocument();
  });
});
