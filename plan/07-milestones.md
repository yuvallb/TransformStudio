# Milestones

Phased delivery plan. Each milestone has a clear **Definition of Done (DoD)**.

## Overview

```
M0 ──→ M1 ──→ M2 ──→ M3 ──→ M4 ──→ M5 ──→ M6 ──→ M7 ──→ M8 ──→ M9
setup   kernel  slice   profile  nodes   params  version export  share  polish
```

Estimated relative effort:

| Milestone | Relative effort | Cumulative |
|-----------|----------------|------------|
| M0 | 1x | 1x |
| M1 | 2x | 3x |
| M2 | 4x | 7x |
| M3 | 2x | 9x |
| M4 | 4x | 13x |
| M5 | 2x | 15x |
| M6 | 3x | 18x |
| M7 | 2x | 20x |
| M8 | 2x | 22x |
| M9 | 3x | 25x |

---

## M0: Project setup

**Goal:** Runnable project skeleton with CI and deployment.

### Tasks

- [ ] Initialize Vite + React 19 + TypeScript project
- [ ] Add Tailwind CSS + shadcn/ui (Button, Dialog, Input, Select, Tabs, Toast)
- [ ] Configure ESLint + Prettier
- [ ] Set up Vitest + React Testing Library
- [ ] Set up Playwright for E2E
- [ ] Configure Vite `base` for GitHub Pages (`/RefineIt/`)
- [ ] Add SPA 404 fallback for GitHub Pages
- [ ] GitHub Actions: lint → typecheck → test → build → deploy to Pages
- [ ] Basic app shell: header, empty main area, footer

### DoD

- `npm run build` produces static output.
- GitHub Actions deploys to GitHub Pages on push to main.
- Blank app loads in browser.

---

## M1: Pyodide kernel

**Goal:** Python/Pandas running off the main thread with a working RPC bridge.

### Tasks

- [ ] Create Web Worker file (`src/worker/pyodide.worker.ts`)
- [ ] Integrate Comlink for typed RPC
- [ ] Lazy-load Pyodide on first use with progress indicator
- [ ] Load pandas + numpy packages
- [ ] Configure Pandas options: **enable Copy-on-Write** (`pd.options.mode.copy_on_write = True`) for memory efficiency
- [ ] Write Python helper module: `preview_df()`, `profile_df()` with robust sampling/empty checks
- [ ] Implement `runPython(code) → result` RPC method
- [ ] Implement `loadCsv(bytes, options) → preview` RPC method
- [ ] Error capture: Python exceptions → structured error objects
- [ ] Implement **Web Worker crash detection & heartbeat/ping mechanism** on the main thread
- [ ] Main thread hook: `usePyodide()` with loading state and auto-restart crash recovery
- [ ] Smoke test UI: button that loads Pyodide, creates a DataFrame, returns `head()`

### DoD

- Clicking "Test Pyodide" in the UI loads the runtime, runs `pd.DataFrame({"a": [1,2,3]})`, and displays the result.
- UI remains responsive during Pyodide load and execution.
- Worker errors are surfaced in the UI.

---

## M2: Vertical slice (critical path)

**Goal:** End-to-end pipeline — the single most important milestone.

### Pipeline

```
CSV Source → Filter → GroupBy → Output
```

### Tasks

- [ ] Integrate React Flow: canvas with pan/zoom, node rendering, edge connections
- [ ] Define node contract interface (`NodeDefinition`) with rich input ports schema
- [ ] Implement 4 node types: `source.csv`, `filter`, `groupby`, `output` (using safe `params` dict passing)
- [ ] Node palette: drag to add
- [ ] Build execution engine: topo sort, fingerprint cache, incremental recompute
- [ ] Implement **active memory cleanup** in the execution engine (explicitly run `del namespace["node_<id>"]` and trigger Python garbage collection `import gc; gc.collect()` on node deletion)
- [ ] Wire engine to Pyodide worker
- [ ] Drag-and-drop CSV import → auto-create source node
- [ ] Virtualized preview grid (glide-data-grid) showing selected node's output
- [ ] Code view panel (CodeMirror): per-node and full-pipeline Python
- [ ] Python script export (download `.py`)
- [ ] Basic error display per node (red border + error message)
- [ ] Zustand store: workflow graph, selection, runtime state

### DoD

- User can: drag CSV → see preview → add Filter → add GroupBy → see live previews → view generated code → export Python script.
- Editing Filter config recomputes only Filter + GroupBy (not Source).
- Exported script contains correct topo-ordered Pandas code.
- README Flow B works end-to-end.

---

## M3: Data import + profiling

**Goal:** Robust import and automatic data profiling.

### Tasks

- [ ] JSON source node (`source.json`)
- [ ] CSV options in inspector: delimiter, header, encoding
- [ ] Profile panel UI: per-column cards with stats
- [ ] Numeric histogram rendering
- [ ] Categorical top-values display
- [ ] Profile computed in worker, displayed in side panel
- [ ] Column click in profile → highlight in preview grid

### DoD

- Load CSV or JSON → see table + full profile.
- Profile updates when selecting any node in the pipeline.
- README Flow A works end-to-end.

---

## M4: Full v1 node library

**Goal:** All transform nodes needed for real-world pipelines.

### Tasks

- [ ] Implement remaining transform nodes: Select, Rename, Derive, Sort, Join, Concat, Drop NA, Fill NA, Cast
- [ ] Multi-input handles for Join (left + right) and Concat
- [ ] Auto-generated inspector forms from `inspectorSchema()`
- [ ] Column picker component (populated from upstream schema)
- [ ] Expression input component (for Filter, Derive)
- [ ] Per-node input preview (collapsible, shows upstream data)
- [ ] Validation: show errors in inspector before execution
- [ ] Unit tests for each node's `compile()` and `validate()`

### DoD

- All v1 nodes work in isolation and in combination.
- Join node correctly merges two upstream datasets.
- Invalid config shows clear validation errors without executing.

---

## M5: Parameters

**Goal:** Reusable, parameterized workflows.

### Tasks

- [ ] Workflow params CRUD UI (add/edit/remove params)
- [ ] Param type editors (string, number, date, enum, boolean)
- [ ] `{param}` reference syntax in expression fields
- [ ] Param substitution in `compile()` at codegen time
- [ ] "Run with parameters" dialog
- [ ] Params included in workflow serialization

### DoD

- Create a filter `country = {country}` with param `country` defaulting to `"US"`.
- Change param to `"UK"` via dialog → pipeline re-runs with new value.
- README Flow D works end-to-end.

---

## M6: Persistence + versioning

**Goal:** Work survives page reload; users can track and revert changes.

### Tasks

- [ ] Dexie schema: `workflows`, `datasets`, `versions` tables
- [ ] Autosave on workflow edit (debounced)
- [ ] Restore on page load
- [ ] Store imported file bytes in IndexedDB
- [ ] Version snapshot creation (manual + auto)
- [ ] Version history panel: list, revert, fork
- [ ] JSON diff compare between two versions
- [ ] "New workflow" action

### DoD

- Reload page → workflow and data restored, pipeline re-executed.
- Save version → make changes → revert → previous state restored.
- Fork creates independent workflow from snapshot.
- README Flow F works end-to-end.

---

## M7: Export — Jupyter notebook

**Goal:** Export pipelines as runnable Jupyter notebooks.

### Tasks

- [ ] `.ipynb` JSON generator (nbformat v4)
- [ ] Markdown cells for node labels/descriptions
- [ ] Code cells for compiled Python snippets
- [ ] Download as `pipeline.ipynb`
- [ ] Polish Python script export (header comment, imports, section comments)

### DoD

- Export notebook → open in Jupyter → run all cells → same result as in RefineIt.
- README Flow E works for both Python script and notebook formats.

---

## M8: Sharing

**Goal:** Share workflows via URL without any backend.

### Tasks

- [ ] Workflow serializer (strip runtime state, keep graph + params)
- [ ] gzip compress + base64url encode
- [ ] Write to `window.location.hash`
- [ ] Parse hash on app load → restore workflow
- [ ] Size guard: warn + offer file fallback for large workflows
- [ ] `.refineit.json` file export/import
- [ ] "Share" button with copy-to-clipboard
- [ ] Shared workflow shows "Import your dataset" on source nodes

### DoD

- Share workflow → copy URL → open in new tab → workflow restored → upload data → run.
- README Flow C works end-to-end.
- Large workflow falls back to file export gracefully.

---

## M9: Hardening & launch

**Goal:** Production-quality polish for real users.

### Tasks

- [ ] Error UX: full Python tracebacks in expandable panel per node
- [ ] Performance: test with ~50–100 MB CSV, profile worker memory
- [ ] Memory eviction: delete node → free worker variable
- [ ] Loading states: skeleton UI during Pyodide init and recompute
- [ ] Keyboard shortcuts: delete node, undo, save version
- [ ] Accessibility: focus management, ARIA labels, keyboard navigation
- [ ] Service worker: cache Pyodide assets for faster repeat visits
- [ ] Demo workflows: ship 2–3 example pipelines with sample datasets
- [ ] Documentation: update README with screenshots, usage guide
- [ ] E2E test suite: full vertical slice + sharing round-trip
- [x] Brand logo + favicon; replace header placeholder
- [x] About dialog with product copy and GitHub/issue links
- [x] Footer external links; meta/OG tags
- [x] Enrich demo welcome card with tagline and value props

### DoD

- 50 MB CSV loads and transforms without UI freeze.
- All E2E tests pass.
- Demo workflows runnable from the landing page.
- README updated with live GitHub Pages link.
