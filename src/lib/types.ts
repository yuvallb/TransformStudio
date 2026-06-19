export type ColumnDtype = 'int' | 'float' | 'string' | 'bool' | 'datetime' | 'unknown';

export interface ColumnSchema {
  name: string;
  dtype: ColumnDtype;
  pandasDtype: string;
  nullable: boolean;
}

export interface PreviewPayload {
  columns: ColumnSchema[];
  rows: Record<string, unknown>[];
  totalRows: number;
  totalColumns: number;
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  nullCount: number;
  nullPct: number;
  uniqueCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  histogram?: HistogramBin[];
  topValues?: Record<string, number>;
}

export interface StructuredError {
  message: string;
  traceback?: string;
  nodeId?: string;
}

export interface LoadCsvOptions {
  delimiter?: string;
  header?: boolean;
  encoding?: string;
}

export type KernelStatus = 'idle' | 'loading' | 'ready' | 'error' | 'crashed';

export interface RunPythonResult {
  result?: unknown;
  error?: StructuredError;
}

export interface LoadCsvResult {
  preview?: PreviewPayload;
  error?: StructuredError;
}

export type NodeType =
  | 'source.csv'
  | 'source.json'
  | 'filter'
  | 'select'
  | 'rename'
  | 'derive'
  | 'sort'
  | 'groupby'
  | 'join'
  | 'concat'
  | 'fillna'
  | 'dropna'
  | 'cast'
  | 'output';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  title?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowParam {
  name: string;
  type: 'string' | 'number' | 'date' | 'enum' | 'boolean';
  default: unknown;
  label?: string;
  options?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  schemaVersion: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  params: WorkflowParam[];
  createdAt: string;
  updatedAt: string;
}

export type WorkflowRecord = Workflow;

export interface DatasetRecord {
  id: string;
  workflowId: string;
  nodeId: string;
  filename: string;
  mimeType: string;
  data: ArrayBuffer;
  importedAt: string;
}

export interface VersionSnapshot {
  id: string;
  workflowId: string;
  parentId: string | null;
  message: string;
  workflow: Workflow;
  createdAt: string;
}

export interface ConfigFieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface WorkflowDiff {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
  configDiffs: Record<string, ConfigFieldDiff[]>;
  paramsChanged: boolean;
}

export type NodeStatus = 'idle' | 'running' | 'stale' | 'success' | 'error';

export interface NodeRuntimeState {
  nodeId: string;
  status: NodeStatus;
  fingerprint: string | null;
  preview: PreviewPayload | null;
  profile: ColumnProfile[] | null;
  error: string | null;
  traceback: string | null;
}

export interface NodeDataset {
  nodeId: string;
  filename: string;
  data: Uint8Array;
}

export interface PipelineNodeRequest {
  nodeId: string;
  code: string;
  isStale: boolean;
  csvBytes?: Uint8Array;
  csvOptions?: LoadCsvOptions;
  jsonBytes?: Uint8Array;
}

export interface ProfileNodeResult {
  profile?: ColumnProfile[];
  error?: StructuredError;
}

export interface ExportNodeResult {
  data?: string;
  error?: StructuredError;
}

export interface ExecutePipelineRequest {
  nodes: PipelineNodeRequest[];
  params: Record<string, unknown>;
  deleteNodeIds?: string[];
}

export interface ExecutePipelineResult {
  nodeResults: Record<string, NodeRuntimeState>;
  error?: StructuredError;
}

export interface ExpressionValidationResult {
  valid: boolean;
  error?: string;
}
