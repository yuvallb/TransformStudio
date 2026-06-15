# Architecture

## Guiding constraints

1. **Zero backend** — parsing, execution, storage, and sharing all run in the browser.
2. **Privacy / local-first** — user data never leaves the machine unless explicitly exported.
3. **Pyodide execution** — Pandas/NumPy run in a Web Worker to keep the UI responsive.
4. **Workflow vs. data separation** — shareable artifacts contain logic + parameters only, never datasets.

## High-level diagram

```mermaid
flowchart TB
  subgraph UI["Main thread (React)"]
    Canvas["DAG Canvas (React Flow)"]
    Inspector["Node Inspector / Params"]
    Preview["Preview Grid + Profiler"]
    CodeView["Code View / Export"]
    Store["Zustand store (graph, selection, params)"]
    Engine["Execution engine\n(topo sort, fingerprints, codegen)"]
  end

  subgraph Persist["Browser storage"]
    IDB[("IndexedDB (Dexie)\ndatasets, workflows, versions")]
    URL["URL hash (#w=...)\ncompressed workflow"]
  end

  subgraph Worker["Web Worker"]
    Kernel["Snippet executor\n(run Python, preview, profile)"]
    Pyodide["Pyodide (pandas / numpy)"]
  end

  Canvas <--> Store
  Inspector <--> Store
  Store <--> Engine
  Engine -- "compiled snippets + stale node list" --> Kernel
  Kernel <--> Pyodide
  Kernel -- "preview JSON / profile / errors" --> Preview
  Store <--> IDB
  Store <--> URL
  CodeView <-- "generated code" --- Engine
```

## Thread model

### Main thread (React)

- Renders the DAG canvas, node inspector, preview grid, profiler, and code view.
- Holds the **serializable workflow graph** in Zustand.
- **Plans pipeline execution** on the main thread: topological sort, content fingerprints, incremental stale-node selection, and per-node Python codegen (`src/engine/`).
- Sends compiled snippets and eviction requests to the worker; receives lightweight preview/profile payloads.
- Never holds full DataFrames.

### Web Worker (Pyodide kernel)

- Loads and initializes Pyodide (lazy, on first use).
- Maintains a Python namespace keyed by node ID (`node_<id>` → DataFrame).
- **Executes pre-compiled Python snippets** sent by the main thread (does not topo-sort or codegen).
- Evicts deleted node vars (`del node_<id>` + `gc.collect()`) when told via `deleteNodeIds`.
- Returns only small JSON previews and profile stats across the worker boundary.

**Why a worker is non-negotiable:** Pyodide is ~6–10 MB and Python execution is CPU-heavy. Running on the main thread would freeze pan/zoom/selection on the canvas.

**Worker crash recovery:** Since Pyodide runs in a Web Worker, a memory overflow (OOM) or an infinite loop in Python will crash the worker. The main thread will implement:
1. A **heartbeat/ping mechanism** to detect if the worker becomes unresponsive during heavy computations.
2. An `onerror` and `onmessageerror` listener on the Worker instance.
3. On crash detection, the UI will display a non-blocking toast ("Python runtime crashed. Restarting..."), automatically spin up a fresh worker, restore the workflow from IndexedDB, re-import the active datasets, and re-execute the pipeline incrementally to restore the user's session without data loss.

## Data flow

### Import

1. User drags a file (CSV/JSON) into the browser.
2. Main thread reads the file as text/binary.
3. File bytes are passed to the worker.
4. Worker loads into Pandas (`read_csv`, `read_json`).
5. Worker returns preview JSON + profile stats.
6. Full DataFrame stays in the worker; a copy of the raw file is stored in IndexedDB for reload.

### Transform

1. User edits a node config or adds/removes an edge.
2. Store marks the affected node + all downstream nodes as stale (`staleNodeIds` in workflow-store).
3. Main-thread engine builds a partial recompute request: topo-sorted stale nodes, compiled Python snippets, fingerprints.
4. Worker executes only the sent snippets; evicts vars for deleted nodes when `deleteNodeIds` is set.
5. Worker emits updated previews per node.
6. Main thread updates runtime-store previews and the code view.

### Share

1. User clicks "Share".
2. Store serializes workflow (nodes, edges, params) — **no data**.
3. JSON is gzip-compressed and encoded as a URL hash (`#w=...`).
4. Recipient opens the link, uploads their own dataset, runs the same pipeline.

### Persist

1. Autosave writes current workflow + version snapshots to IndexedDB.
2. On reload, restore workflow from IndexedDB; re-import datasets from stored files.
3. Re-run the pipeline to repopulate worker-side DataFrames.

## Deployment (GitHub Pages)

- Static build via Vite; no server-side logic.
- Set Vite `base` to the repo path (e.g. `/TransformStudio/`).
- Add SPA 404 fallback (`404.html` → `index.html`) for client-side routing.
- Standard Pyodide does **not** require COOP/COEP headers, so GitHub Pages works without special config.
- Optional: service worker to cache Pyodide runtime assets across visits.

## Security considerations

- All Python execution is sandboxed inside Pyodide (no filesystem, no network by default).
- Shared URLs contain only workflow logic — no user data.
- No `eval` of user-supplied Python in v1 (custom Python node deferred).
- **Constrained expression evaluation:** Expression nodes (filter, derive) allow users to write custom expressions (e.g., `df["revenue"] > 1000`). To prevent arbitrary code execution or injection (e.g., calling `__import__('os')` or accessing private attributes):
  1. The expression is parsed in Python using Python's native `ast.parse()` module.
  2. An AST node visitor inspects the parsed tree and whitelists only safe AST nodes (e.g., `Name`, `Num`, `Str`, `Compare`, `BinOp`, `UnaryOp`, `Subscript`, `Attribute`).
  3. Any node that attempts function calls (except whitelisted math/string functions), imports, or attribute writes is rejected before execution.
  4. Once validated, the expression is evaluated using Pandas `df.eval()` or a safe execution context with a restricted globals/locals dictionary.
