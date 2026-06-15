# M9: Hardening & Launch

**Goal:** Production-quality polish, performance validation, demo content, and launch readiness.

**Prerequisites:** M8 complete.

**Estimated effort:** 3x

---

## Task 1: Error UX — expandable tracebacks

### Implementation

- Per-node error panel in Inspector:
  - Summary line (last exception message)
  - Expandable **Full traceback** ( monospace, scrollable )
- Graph-level errors: banner with dismiss
- Copy traceback button
- Red node border + error icon (extend M2 styling)
- Avoid infinite loops of errors popups

---

## Task 2: Performance — large CSV validation

### Implementation

- Test with `tests/fixtures/sales-large.csv` (~100,000 rows) and synthetic ~50 MB file
- Profile worker memory in Chrome DevTools during:
  - Import
  - Filter → GroupBy pipeline
  - Node delete (memory should drop)
- Show warning toast when file > 50 MB: "Large file — processing may be slow"
- Footer memory indicator (optional): approximate worker status text

### Targets

| Metric | Target |
|--------|--------|
| UI responsiveness | Canvas pan/zoom works during execution |
| 50 MB CSV | Loads and transforms without tab crash |
| 100 MB CSV | Stretch goal — best effort, warn user |
| Preview transfer | Never > 100 rows across worker boundary |

---

## Task 3: Memory eviction verification

### Implementation

- Audit all node delete paths call worker `deleteNodeVar(nodeId)`
- Worker: `del namespace["node_<id>"]` + `import gc; gc.collect()`
- Integration test: delete node mid-pipeline, re-add — no memory growth loop
- Document findings in test comments

---

## Task 4: Loading states and skeleton UI

### Implementation

- Pyodide init: progress bar or stepped loader in footer
- Pipeline recompute: subtle loading indicator on affected nodes (spinner on amber border)
- Preview grid skeleton while fetching
- Profile panel skeleton
- Disable Share/Export during active execution (optional)

---

## Task 5: Keyboard shortcuts

### Implementation

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected node or edge |
| `Ctrl/Cmd + Z` | Undo (if undo stack implemented) |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + S` | Save version (manual snapshot) |

- Undo/redo: Zustand temporal middleware or manual history stack on workflow-store
- Show shortcut hints in tooltips or help dialog

---

## Task 6: Accessibility

### Implementation

- Focus management: dialog open → trap focus; close → restore
- ARIA labels on node palette items, Share/Export buttons, preview grid
- Keyboard navigation: Tab through palette, inspector fields
- Status colors supplemented with icons/text (not color-only)
- Run axe-core or Lighthouse a11y audit — fix critical issues

---

## Task 7: Service worker for Pyodide caching

### Implementation

- Register service worker in production build only
- Cache Pyodide core WASM/JS assets and package files
- Strategy: cache-first for Pyodide static assets, network-first for app shell
- Verify repeat visit load time improvement (manual metric)
- Do not cache user data or IndexedDB content

### Files

| Action | Path |
|--------|------|
| Create | `public/sw.js` or Vite PWA plugin config |

---

## Task 8: Demo workflows and sample data

### Implementation

- Ship in `public/demo/`:
  - `sales.csv`, `customers.csv` (and matching JSON if needed)
- Create 2–3 preset workflows loadable from landing/welcome:
  1. **Sales analysis:** CSV → Filter → GroupBy → Output
  2. **Customer join:** Two sources → Join → Select → Output
  3. **Parameterized template:** Filter with `{country}` param
- "Open demo" button on first visit or empty state

---

## Task 9: Documentation update

### Implementation

- Update root `README.md`:
  - Live GitHub Pages link
  - Screenshots of canvas, preview, profile, code view
  - Quick start: open link → load demo → build pipeline
  - Keyboard shortcuts table
  - Known limitations (50–100 MB, no Excel, browser-only)
- Remove or fix stale references (e.g. Excel in v1 feature list if still present)

---

## Task 10: Full E2E test suite

### Implementation

Ensure all E2E specs pass reliably in CI:

| Spec | Coverage |
|------|----------|
| `pyodide-smoke.spec.ts` | Worker loads, no console errors |
| `vertical-slice.spec.ts` | M2 full pipeline **including Output node** (CSV → Filter → GroupBy → Output) |
| `sharing.spec.ts` | M8 URL round-trip (Flow C: share → new tab → restore → upload → run) |
| `params.spec.ts` | M5 param dialog (if not merged into vertical slice) |
| `versioning.spec.ts` | M6 revert, reload, **fork**, and **compare** flows |
| `notebook-export.spec.ts` (or extend export E2E) | M7 `.ipynb` download smoke test |

- Add retries for flaky Pyodide load in CI (max 2)
- Record video on failure (Playwright config)

---

## Task 11: CI hardening

### Implementation

- Ensure GitHub Actions runs: lint → typecheck → test:unit → test:integration → test:e2e → build → deploy
- Cache npm and Playwright browsers
- Fail build on test failure (no deploy)
- Optional: bundle size comment on PR (not required for DoD)

---

## Task 13: M1 Pyodide smoke UI (close M1 DoD gap)

M1 DoD requires a UI-visible Pyodide smoke test. Integration coverage exists (`tests/integration/kernel.test.ts`) but there is no in-app trigger.

### Implementation

- Add a **Test Pyodide** action (footer dev control or Help → Diagnostics):
  - Lazy-init kernel if needed
  - Run `pd.DataFrame({"a": [1, 2, 3]})` and display `head()` result inline or in a toast/dialog
- Show loading state during init; surface worker errors in UI
- Gate behind `import.meta.env.DEV` **or** expose in production Help as a lightweight health check (pick one and document)

### Acceptance

- Clicking the control loads Pyodide, runs the DataFrame smoke, and shows the result without freezing the UI.

---

## Task 14: Schema migration & data-repo unit tests

Static review found migration infrastructure without test coverage.

### Implementation

- Add `tests/unit/data/migrations.test.ts`:
  - `migrateWorkflow()` round-trip at current `WORKFLOW_SCHEMA_VERSION`
  - Future: wire `MIGRATIONS` map and test `v1-to-v2` when schema bumps
- Add `tests/unit/data/version-repo.test.ts`:
  - CRUD for version snapshots (create, list, get, delete)
  - Fork/revert data integrity at repo layer

### Acceptance

- Both test files pass in `npm run test:unit`.

---

## Task 15: Architecture alignment & state boundaries

Plan docs (`plan/01-architecture.md`) describe topo sort, fingerprint cache, and incremental recompute in the worker; implementation plans on the main thread. State also drifts: `workflow-store` holds `staleNodeIds`, `paramOverrides`, and `datasets` beyond the planned graph/params/selection split.

### Implementation

- **Document or refactor** execution ownership:
  - Option A (preferred for launch): update `plan/01-architecture.md` to reflect main-thread pipeline planning + worker snippet execution
  - Option B: move orchestration into worker (larger refactor — only if explicitly chosen)
- **Tighten Zustand boundaries:**
  - Move `staleNodeIds` (and transient `paramOverrides`) to `runtime-store` or a dedicated execution slice
  - Keep `datasets` documented as intentional non-persisted workflow-store concern, or extract to a `datasets-store`
- Move dialog open state (`paramDialogOpen`, `shareOpen`, `exportOpen`, `versionOpen`) from `Header.tsx` local state to `ui-store` for consistency

### Acceptance

- Plan docs match implementation OR refactor is complete.
- Store ownership documented in `AGENTS.md` state table.
- No regressions in autosave, execution debounce, or param dialog flow.

---

## Task 16: Code hygiene & defensive hardening

Minor gaps from static review — low effort, reduces tech debt before launch.

### Implementation

| Item | Action |
|------|--------|
| Unused `lodash` dependency | Remove from `package.json` if still unused |
| `parsePythonException` duplication | Consolidate to `src/engine/errors.ts` (or `src/lib/`) — single helper used by worker + kernel-client |
| `nodeRegistry` typing | Change `Partial<Record<…>>` → `Record<NodeType, NodeDefinition>` for compile-time completeness |
| `SAFE_NODE_ID_PATTERN` | Either enforce in `validateShareablePayload` / kernel paths or remove unused export |
| `PreviewGrid` preview cap | Defensively slice rows to `PREVIEW_ROW_CAP` in UI (don't rely solely on worker cap) |
| Pandas CoW deprecation warning | Remove explicit `pd.options.mode.copy_on_write = True` if Pyodide pandas ≥ 3 always enables CoW; document in worker comment |
| `runPython()` public hook | Restrict to dev/test bridge or remove from `usePyodide` public API |
| `validateConnection()` in codegen | Move graph-validation helper to `src/engine/graph-validation.ts` or `src/canvas/` |

### Acceptance

- `npm run lint && npm run typecheck && npm run test:unit` pass after cleanup.
- No new `any` or eslint suppressions introduced.

---

## Task 17: M4 Concat multi-input (stretch)

Plan lists Concat as "2+" inputs; implementation supports exactly two handles.

### Implementation

- Extend `concat` node to accept N ≥ 2 inputs (dynamic input ports or "Add input" in inspector)
- Update `NodeRenderer` handles, topo-sort input vars, and unit tests

### Acceptance

- Concat with 3+ upstream datasets works in isolation and in a demo workflow.

*Stretch goal — not required for M9 DoD unless time permits.*

---

## Task 12: Final UX polish pass

### Implementation

Per [`plan/UX-guidelines.md`](../plan/UX-guidelines.md):

- Three-panel layout spacing and responsive min-widths
- Status colors consistent: green success, amber stale, red error
- Node connection handles highlight on compatible drag
- Empty states: no workflow, no selection, no preview
- Toast notifications for save, share, export, crash recovery

---

## Testing requirements

| Layer | What to test | File |
|-------|--------------|------|
| Unit | Undo/redo stack (if implemented) | `tests/unit/state/undo.test.ts` |
| Unit | Workflow schema migrations | `tests/unit/data/migrations.test.ts` |
| Unit | Version repo CRUD | `tests/unit/data/version-repo.test.ts` |
| Unit | All existing unit tests still pass | full suite |
| Integration | Memory cleanup on node delete | `tests/integration/memory.test.ts` |
| E2E | Full suite green | `tests/e2e/*.spec.ts` |
| Manual | 50 MB CSV performance | checklist below |
| Manual | Lighthouse performance/a11y scores | — |

### Performance manual checklist

1. Load 50 MB CSV — UI remains interactive during processing
2. DevTools Memory — no unbounded growth after 10 edit/recompute cycles
3. Delete half the nodes — memory drops measurably
4. Cold vs warm Pyodide load — warm significantly faster with service worker

---

## Acceptance criteria

### Definition of Done

- [ ] 50 MB CSV loads and transforms without UI freeze (pan/zoom works during execution).
- [ ] All E2E tests pass in CI on every push to main (sharing, pyodide smoke, notebook export, fork/compare).
- [ ] M1 Pyodide smoke UI available (Task 13).
- [ ] Migration and version-repo unit tests added (Task 14).
- [ ] Architecture/state boundary alignment documented or implemented (Task 15).
- [ ] Demo workflows runnable from landing/empty state without manual setup.
- [ ] README updated with live GitHub Pages link and usage guide.
- [ ] Expandable Python tracebacks available per failed node.
- [ ] Keyboard shortcuts work for delete and save version (undo if implemented).
- [ ] Critical accessibility issues resolved (focus, labels, non-color-only status).
- [ ] Service worker caches Pyodide for faster repeat visits.
- [ ] No deferred features accidentally shipped (Excel, dbt, custom Python).

### Launch checklist

- [ ] GitHub Pages live and linked from README
- [ ] All milestones M0–M8 acceptance criteria still met (regression)
- [ ] `npm run build` output size acceptable (< reasonable budget for static app)
- [ ] Privacy model documented: data stays local, URLs contain no datasets
- [ ] Known issues listed in README if any stretch goals unmet (e.g. 100 MB)

---

## Verification checklist

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```

Manual: run demo workflows, load 50 MB fixture, verify GitHub Pages deployment.

---

## Out of scope (remain deferred)

- Excel import (`openpyxl`)
- dbt/SQL export
- Custom Python node
- Arrow IPC / chunking for >100 MB
- Cross-browser automated CI (Safari/Firefox manual QA only)
- Automated performance benchmarks in CI
- Backend or cloud features

---

## Post-launch (backlog hints)

Track separately — not part of M9 DoD:

- Pivot, melt, dedup nodes
- Editable code view → custom Python node
- SQL export (best-effort)
- Internationalization
