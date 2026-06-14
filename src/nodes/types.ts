import type { ColumnSchema, NodeType } from '@/lib/types';

export interface NodeInputPort {
  id: string;
  label: string;
}

export interface ValidationError {
  field?: string;
  message: string;
}

export type InspectorField =
  | { kind: 'text'; key: string; label: string }
  | { kind: 'number'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; options: string[] }
  | { kind: 'column'; key: string; label: string }
  | { kind: 'columns'; key: string; label: string }
  | { kind: 'expression'; key: string; label: string }
  | { kind: 'param-ref'; key: string; label: string };

export type CompileMode = 'execution' | 'export';

export interface CompileContext {
  mode?: CompileMode;
}

export interface NodeDefinition {
  type: NodeType;
  label: string;
  category: 'source' | 'transform' | 'output';
  inputs: NodeInputPort[];
  outputs: number;

  defaultConfig(): Record<string, unknown>;

  validate(
    config: Record<string, unknown>,
    inputSchemas: ColumnSchema[][],
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
