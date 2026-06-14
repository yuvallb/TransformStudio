import { describe, expect, it } from 'vitest';

import {
  extractParamRefs,
  extractParamRefsFromConfig,
  getEffectiveParams,
  getNodesReferencingParam,
  resolveParamsForNode,
} from '@/engine/param-substitute';
import type { Workflow } from '@/lib/types';

const workflow: Pick<Workflow, 'nodes'> = {
  nodes: [
    {
      id: 'flt',
      type: 'filter',
      position: { x: 0, y: 0 },
      config: { expression: 'country == {country} and revenue > {min_revenue}' },
    },
    {
      id: 'grp',
      type: 'groupby',
      position: { x: 0, y: 0 },
      config: { groupColumns: ['region'], aggregations: [] },
    },
  ],
};

describe('param-substitute', () => {
  it('extracts param refs from text', () => {
    expect(extractParamRefs('country == {country}')).toEqual(['country']);
    expect(extractParamRefs('{a} + {b}')).toEqual(['a', 'b']);
  });

  it('extracts param refs from node config', () => {
    expect(extractParamRefsFromConfig(workflow.nodes[0]!.config)).toEqual([
      'country',
      'min_revenue',
    ]);
  });

  it('resolves only referenced params for a node', () => {
    const resolved = resolveParamsForNode(workflow.nodes[0]!, {
      country: 'US',
      min_revenue: 1000,
      unused: true,
    });
    expect(resolved).toEqual({ country: 'US', min_revenue: 1000 });
  });

  it('finds nodes referencing a param', () => {
    expect(getNodesReferencingParam(workflow, 'country')).toEqual(['flt']);
    expect(getNodesReferencingParam(workflow, 'min_revenue')).toEqual(['flt']);
    expect(getNodesReferencingParam(workflow, 'missing')).toEqual([]);
  });

  it('merges overrides into effective params', () => {
    const effective = getEffectiveParams(
      [
        { name: 'country', type: 'string', default: 'US' },
        { name: 'min_revenue', type: 'number', default: 1000 },
      ],
      { country: 'UK' },
    );
    expect(effective).toEqual({ country: 'UK', min_revenue: 1000 });
  });

  it('ignores unrelated params when resolving for node', () => {
    const resolved = resolveParamsForNode(workflow.nodes[1]!, {
      country: 'US',
      min_revenue: 1000,
    });
    expect(resolved).toEqual({});
  });
});
