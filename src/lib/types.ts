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

export type NodeStatus = 'idle' | 'running' | 'stale' | 'success' | 'error';

export interface NodeRuntimeState {
  nodeId: string;
  status: NodeStatus;
  fingerprint: string | null;
  preview: PreviewPayload | null;
  error: string | null;
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
