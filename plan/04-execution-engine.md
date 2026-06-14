# Execution Engine

The execution engine runs inside the Web Worker and is responsible for turning the visual DAG into Pandas operations.

## Responsibilities

1. Topologically sort the DAG.
2. Compile each node's config into a Python snippet.
3. Execute snippets against upstream DataFrames in the Pyodide namespace.
4. Cache results via content fingerprints.
5. Incrementally recompute only stale nodes on edit.
6. Return lightweight preview/profile payloads to the main thread.

## Run loop

```
1. Receive run request: { nodes, edges, params, staleNodeIds? }
2. Topologically sort nodes (Kahn's algorithm)
   → if cycle detected, return error
3. For each node in topo order:
   a. Skip if node is not stale and fingerprint matches cache
   b. Gather upstream output variable names
   c. Call nodeDefinition.compile(config, inputVars, outputVar, params)
   d. Execute compiled Python snippet in Pyodide namespace
   e. Compute fingerprint = hash(node.type + node.config + params + upstream fingerprints)
   f. Store result as `node_<id>` in namespace
   g. Generate preview payload (head N rows, dtypes, shape)
   h. Emit preview to main thread
4. Return final status per node
```

## Fingerprinting & cache

```typescript
function computeFingerprint(
  node: WorkflowNode,
  params: Record<string, unknown>,
  upstreamFingerprints: string[]
): string {
  const payload = JSON.stringify({
    type: node.type,
    config: node.config,
    params: resolveParams(node.config, params),
    upstream: upstreamFingerprints,
  });
  return sha256(payload);
}
```

- Cache is a `Map<nodeId, { fingerprint, preview }>` inside the worker.
- On node edit: mark that node + all transitive downstream nodes as stale.
- On edge change: mark target node + downstream as stale.
- On param change: mark all nodes referencing that param + downstream as stale.

## Incremental recompute

Only stale nodes are re-executed. Upstream cached results are reused.

```
User edits Filter node config
  → Filter marked stale
  → GroupBy (downstream) marked stale
  → Sort (downstream of GroupBy) marked stale
  → Source node NOT stale (unchanged)
  → Re-run: Filter → GroupBy → Sort only
```

## Python namespace management

```python
# Inside the worker, namespace looks like:
{
  "node_abc123": <DataFrame>,   # source CSV
  "node_def456": <DataFrame>,   # after filter
  "node_ghi789": <DataFrame>,   # after groupby
  "pd": <pandas module>,
  "np": <numpy module>,
}
```

- Each node's output is stored as `node_<id>`.
- On node delete: `del namespace["node_<id>"]` to free memory.
- On full workflow clear: reset namespace, keep `pd`/`np` imports.

## Memory Optimization (Copy-on-Write)

To prevent browser memory limits (R5) from causing tab crashes when working with 50–100 MB datasets, we will enable **Pandas Copy-on-Write (CoW)**.

```python
import pandas as pd
pd.options.mode.copy_on_write = True
```

### Why CoW is a game-changer:
1. **Zero-copy assignments:** Operations like `df_output = df_input` or column renaming do not duplicate the underlying NumPy arrays in memory.
2. **Safe mutation:** If a downstream node mutates a column, Pandas automatically copies only the affected column's data, sharing the rest of the columns.
3. **Reduced memory footprint:** This reduces peak memory usage in the Web Worker by up to 60% for typical visual pipelines, directly mitigating the R5 risk.

## Code generation

The same `compile()` functions used for execution also produce the exportable script.

### Per-node compilation

```typescript
// Example: Filter node
compile(config, inputVars, outputVar, params) {
  const expr = substituteParams(config.expression, params);
  return `${outputVar} = ${inputVars[0]}[${expr}]`;
}
```

### Full pipeline compilation

```typescript
function generateScript(workflow: Workflow): string {
  const sorted = topoSort(workflow.nodes, workflow.edges);
  const lines = [
    'import pandas as pd',
    'import numpy as np',
    '',
  ];
  for (const node of sorted) {
    const def = getNodeDefinition(node.type);
    const inputVars = getInputVars(node, workflow.edges);
    const outputVar = `df_${node.id}`;
    lines.push(`# ${def.label}: ${node.title || node.id}`);
    lines.push(def.compile(node.config, inputVars, outputVar, workflow.params));
    lines.push('');
  }
  return lines.join('\n');
}
```

**Single source of truth:** the `compile()` function drives live execution, code view, Python script export, and notebook export. "What you preview is what you export."

## Preview generation (Python helper)

```python
def preview_df(df, n=100):
    return {
        "columns": [
            {"name": col, "dtype": str(df[col].dtype), "nullable": df[col].isna().any()}
            for col in df.columns
        ],
        "rows": json.loads(df.head(n).to_json(orient="records", date_format="iso")),
        "totalRows": len(df),
        "totalColumns": len(df.columns),
    }
```

Called after each node execution. Only the JSON preview crosses the worker boundary.

## Profiling (Python helper)

```python
def profile_df(df):
    # CTO Refinement: Sample large datasets for profiling to prevent UI lag and worker OOM
    MAX_PROFILE_ROWS = 100_000
    profile_df = df
    if len(df) > MAX_PROFILE_ROWS:
        profile_df = df.sample(n=MAX_PROFILE_ROWS, random_state=42)
        
    profiles = []
    for col in profile_df.columns:
        series = profile_df[col]
        is_empty = len(series) == 0 or series.isna().all()
        
        p = {
            "name": col,
            "dtype": str(series.dtype),
            "nullCount": int(series.isna().sum()) if not is_empty else len(series),
            "nullPct": float(series.isna().mean()) if len(series) > 0 else 0.0,
            "uniqueCount": int(series.nunique()) if not is_empty else 0,
        }
        
        if pd.api.types.is_numeric_dtype(series):
            p["min"] = float(series.min()) if not is_empty else None
            p["max"] = float(series.max()) if not is_empty else None
            p["mean"] = float(series.mean()) if not is_empty else None
            p["histogram"] = compute_histogram(series) if not is_empty else []
        elif pd.api.types.is_string_dtype(series) or series.dtype == 'object':
            p["topValues"] = series.value_counts().head(10).to_dict() if not is_empty else {}
        elif pd.api.types.is_datetime64_any_dtype(series):
            p["min"] = series.min().isoformat() if not is_empty else None
            p["max"] = series.max().isoformat() if not is_empty else None
            
        profiles.append(p)
    return profiles

def compute_histogram(series, bins=10):
    # Helper to safely compute histogram data
    counts, edges = np.histogram(series.dropna(), bins=bins)
    return [
        {"bin_start": float(edges[i]), "bin_end": float(edges[i+1]), "count": int(counts[i])}
        for i in range(len(counts))
    ]
```

## Error handling

- Python exceptions are caught in the worker and returned as `{ nodeId, error: traceback_string }`.
- Validation errors (from `validate()`) are returned before execution and shown in the inspector.
- Cycle detection returns a graph-level error before any execution.
- Missing upstream data (source node without imported file) returns a clear "import a dataset first" message.

## Parameter substitution (CTO Refinement: Safe Parameter Passing)

To prevent syntax errors and code injection, we **do not** use string substitution in JavaScript. Instead, we pass the parameters as a Python dictionary into the Pyodide namespace before execution, and compile references in Python.

### 1. Load parameters into Pyodide namespace
Before running the execution loop, the worker loads the parameters dictionary:
```python
# In the Pyodide worker namespace:
params = {
    "country": "US",
    "min_revenue": 1000
}
```

### 2. Node compilation references
Instead of JS substitution, the node's `compile()` function generates Python code that references the `params` dictionary directly:
```typescript
// Example: Filter node
compile(config, inputVars, outputVar, params) {
  // Translate `{param_name}` references to `params['param_name']` in Python
  const expr = config.expression.replace(/\{(\w+)\}/g, "params['$1']");
  return `${outputVar} = ${inputVars[0]}.query(${expr})`; // or bracket notation
}
```
Example: `df["country"] == {country}` becomes `df_output = df_input[df_input["country"] == params["country"]]`. This is 100% safe, handles all escaping automatically, and is extremely clean.
