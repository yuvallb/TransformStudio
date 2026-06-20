import type { ColumnSchema, NodeType } from '@/lib/types';

import type { ExportNameMap } from '@/engine/export-names';
import { ALL_PALETTE_GROUPS, PALETTE_GROUP_LABELS } from './palette-groups';

export type PaletteGroup =
  | 'io'
  | 'row'
  | 'column'
  | 'missing'
  | 'aggregate'
  | 'combine'
  | 'text'
  | 'datetime'
  | 'quality'
  | 'window'
  | 'ai'
  | 'python';

export { ALL_PALETTE_GROUPS, PALETTE_GROUP_LABELS };

export interface NodeInputPort {
  id: string;
  label: string;
}

export interface ValidationError {
  field?: string;
  message: string;
}

export interface ValidateContext {
  /** Number of upstream inputs connected (from getInputVars). */
  inputVarCount?: number;
  /** Row counts per connected input, when all previews are available. */
  inputRowCounts?: number[];
  /** Workflow parameter names for validating {param} references. */
  workflowParamNames?: string[];
}

export type InspectorField =
  | { kind: 'text'; key: string; label: string }
  | { kind: 'number'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; options: string[] }
  | { kind: 'column'; key: string; label: string; schemaIndex?: number }
  | { kind: 'columns'; key: string; label: string; schemaIndex?: number }
  | { kind: 'string-list'; key: string; label: string }
  | { kind: 'expression'; key: string; label: string }
  | {
      kind: 'code';
      key: string;
      label: string;
      placeholder?: string;
      minHeight?: string;
      description?: string;
    }
  | { kind: 'mapping'; key: string; label: string }
  | { kind: 'dtype-mapping'; key: string; label: string }
  | { kind: 'aggregations'; key: string; label: string }
  | { kind: 'operations'; key: string; label: string }
  | { kind: 'patterns'; key: string; label: string }
  | { kind: 'classify-rules'; key: string; label: string }
  | { kind: 'param-ref'; key: string; label: string };

export type CompileMode = 'execution' | 'export';

export interface CompileContext {
  mode?: CompileMode;
  exportNames?: ExportNameMap;
}

export interface NodeDefinition {
  type: NodeType;
  label: string;
  category: 'source' | 'transform' | 'output';
  paletteGroup: PaletteGroup;
  paletteOrder?: number;
  hiddenInPalette?: boolean;
  paletteAdvanced?: boolean;
  exportVarSlug?: string;
  inputs: NodeInputPort[];
  outputs: number;

  defaultConfig(): Record<string, unknown>;

  validate(
    config: Record<string, unknown>,
    inputSchemas: ColumnSchema[][],
    context?: ValidateContext,
  ): ValidationError[];

  compile(
    config: Record<string, unknown>,
    inputVars: string[],
    outputVar: string,
    params: Record<string, unknown>,
    context?: CompileContext,
  ): string;

  inspectorSchema(): InspectorField[];

  configSummary(config: Record<string, unknown>): string;
}
