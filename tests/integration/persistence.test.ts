import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/data/db';
import { saveDataset } from '@/data/dataset-repo';
import { saveWorkflow } from '@/data/workflow-repo';
import { useWorkflowStore } from '@/state/workflow-store';
import type { Workflow } from '@/lib/types';

const workflow: Workflow = {
  id: 'persist-wf',
  name: 'Persist test',
  schemaVersion: 1,
  nodes: [
    {
      id: 'src-1',
      type: 'source.csv',
      position: { x: 100, y: 100 },
      config: { filename: 'sales.csv', delimiter: ',', header: true },
    },
    {
      id: 'flt-1',
      type: 'filter',
      position: { x: 300, y: 100 },
      config: { expression: 'revenue > 1000' },
    },
  ],
  edges: [{ id: 'e1', source: 'src-1', target: 'flt-1' }],
  params: [{ name: 'threshold', type: 'number', default: 1000 }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('persistence integration', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useWorkflowStore.setState({
      workflow: {
        id: 'default',
        name: 'Untitled Pipeline',
        schemaVersion: 1,
        nodes: [],
        edges: [],
        params: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      datasets: {},
      isHydrated: false,
      editCount: 0,
      selectedNodeId: null,
      staleNodeIds: new Set(),
      deletedNodeIds: [],
      paramOverrides: {},
    });
  });

  it('round-trips workflow and datasets through IndexedDB', async () => {
    await saveWorkflow(workflow);

    const csvBytes = new TextEncoder().encode('region,revenue\nNorth,1500');
    await saveDataset(workflow.id, 'src-1', {
      nodeId: 'src-1',
      filename: 'sales.csv',
      data: csvBytes,
    });

    const { getMostRecentWorkflow } = await import('@/data/workflow-repo');
    const { loadDatasetsForWorkflow, buildDatasetsMapForWorkflow } = await import(
      '@/data/dataset-repo'
    );

    const restored = await getMostRecentWorkflow();
    expect(restored?.nodes).toHaveLength(2);
    expect(restored?.edges).toHaveLength(1);
    expect(restored?.params[0]?.name).toBe('threshold');

    const datasets = await loadDatasetsForWorkflow(workflow.id);
    expect(datasets).toHaveLength(1);

    useWorkflowStore.getState().loadWorkflowState(
      restored!,
      buildDatasetsMapForWorkflow(restored!, datasets),
    );

    const state = useWorkflowStore.getState();
    expect(state.workflow.nodes.map((n) => n.id)).toEqual(['src-1', 'flt-1']);
    expect(state.datasets['src-1']?.filename).toBe('sales.csv');
    expect(new TextDecoder().decode(state.datasets['src-1']!.data)).toContain('North');
  });
});
