import 'fake-indexeddb/auto';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadDatasetsForWorkflow } from '@/data/dataset-repo';
import { listVersions } from '@/data/version-repo';
import { listWorkflows, saveWorkflow } from '@/data/workflow-repo';
import type { Workflow, WorkflowRecord } from '@/lib/types';
import { useWorkflowStore } from '@/state/workflow-store';
import { WorkflowSwitcher } from '@/ui/WorkflowSwitcher';

vi.mock('@/data/workflow-repo', () => ({
  listWorkflows: vi.fn(),
  saveWorkflow: vi.fn(),
}));

vi.mock('@/data/version-repo', () => ({
  listVersions: vi.fn(),
}));

vi.mock('@/data/dataset-repo', () => ({
  loadDatasetsForWorkflow: vi.fn(),
  buildDatasetsMapForWorkflow: vi.fn(() => ({})),
}));

const sampleWorkflow = (overrides: Partial<Workflow> = {}): Workflow => ({
  id: 'wf-current',
  name: 'Current Pipeline',
  schemaVersion: 1,
  nodes: [],
  edges: [],
  params: [],
  createdAt: '2026-06-15T10:00:00.000Z',
  updatedAt: '2026-06-15T10:00:00.000Z',
  ...overrides,
});

const sampleRecord = (overrides: Partial<WorkflowRecord> = {}): WorkflowRecord => ({
  ...sampleWorkflow(),
  id: 'wf-other',
  name: 'Other Pipeline',
  updatedAt: '2026-06-14T10:00:00.000Z',
  ...overrides,
});

describe('WorkflowSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkflowStore.getState().loadWorkflowState(sampleWorkflow(), {});
    useWorkflowStore.getState().setHydrated(true);

    vi.mocked(listWorkflows).mockResolvedValue([
      sampleRecord({ id: 'wf-current', name: 'Current Pipeline' }),
      sampleRecord({ id: 'wf-other', name: 'Other Pipeline' }),
    ]);
    vi.mocked(listVersions).mockResolvedValue([]);
    vi.mocked(saveWorkflow).mockResolvedValue();
    vi.mocked(loadDatasetsForWorkflow).mockResolvedValue([]);
  });

  async function openMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('workflow-switcher-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('new-workflow-item')).toBeInTheDocument();
    });
  }

  it('shows New workflow, demos, and recent records when opened', async () => {
    const user = userEvent.setup();
    render(<WorkflowSwitcher />);

    await openMenu(user);

    expect(screen.getByTestId('new-workflow-item')).toBeInTheDocument();
    expect(screen.getByTestId('demo-item-sales-analysis')).toBeInTheDocument();
    expect(screen.getByTestId('demo-item-customer-join')).toBeInTheDocument();
    expect(screen.getByTestId('recent-item-wf-current')).toBeInTheDocument();
    expect(screen.getByTestId('recent-item-wf-other')).toBeInTheDocument();
  });

  it('loads a demo via fetch and saveWorkflow', async () => {
    const demoWorkflow = sampleWorkflow({
      id: 'demo-wf',
      name: 'Sales Analysis',
      nodes: [{ id: 'n1', type: 'filter', position: { x: 0, y: 0 }, config: {} }],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(demoWorkflow)),
      }),
    );

    const user = userEvent.setup();
    render(<WorkflowSwitcher />);
    await openMenu(user);
    await user.click(screen.getByTestId('demo-item-sales-analysis'));

    await waitFor(() => {
      expect(saveWorkflow).toHaveBeenCalled();
      expect(useWorkflowStore.getState().workflow.name).toBe('Sales Analysis');
      expect(useWorkflowStore.getState().workflow.nodes).toHaveLength(1);
    });

    vi.unstubAllGlobals();
  });

  it('loads a recent workflow from IndexedDB', async () => {
    const other = sampleRecord({
      id: 'wf-other',
      name: 'Other Pipeline',
      nodes: [{ id: 'n2', type: 'output', position: { x: 0, y: 0 }, config: {} }],
    });
    vi.mocked(listWorkflows).mockResolvedValue([other]);

    const user = userEvent.setup();
    render(<WorkflowSwitcher />);
    await openMenu(user);
    await user.click(screen.getByTestId('recent-item-wf-other'));

    await waitFor(() => {
      expect(useWorkflowStore.getState().workflow.id).toBe('wf-other');
      expect(loadDatasetsForWorkflow).toHaveBeenCalledWith('wf-other');
    });
  });

  it('shows guard dialog when opening New with unsaved edits and no versions', async () => {
    useWorkflowStore.getState().addNode('filter', { x: 0, y: 0 });
    vi.mocked(listVersions).mockResolvedValue([]);

    const user = userEvent.setup();
    render(<WorkflowSwitcher />);
    await openMenu(user);
    await user.click(screen.getByTestId('new-workflow-item'));

    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByTestId('guard-confirm')).toBeInTheDocument();
  });

  it('skips guard dialog when a version snapshot exists', async () => {
    useWorkflowStore.getState().addNode('filter', { x: 0, y: 0 });
    vi.mocked(listVersions).mockResolvedValue([
      {
        id: 'v1',
        workflowId: 'wf-current',
        parentId: null,
        message: 'v1',
        workflow: sampleWorkflow(),
        createdAt: '2026-06-15T10:00:00.000Z',
      },
    ]);

    const user = userEvent.setup();
    render(<WorkflowSwitcher />);
    await openMenu(user);
    await user.click(screen.getByTestId('new-workflow-item'));

    await waitFor(() => {
      expect(saveWorkflow).toHaveBeenCalled();
    });
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('does not load when clicking the current workflow row', async () => {
    const user = userEvent.setup();
    render(<WorkflowSwitcher />);
    await openMenu(user);

    const currentItem = screen.getByTestId('recent-item-wf-current');
    expect(currentItem).toHaveAttribute('data-disabled');

    await user.click(currentItem);
    expect(loadDatasetsForWorkflow).not.toHaveBeenCalled();
    expect(useWorkflowStore.getState().workflow.id).toBe('wf-current');
  });
});
