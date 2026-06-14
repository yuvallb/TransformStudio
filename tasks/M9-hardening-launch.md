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
| `vertical-slice.spec.ts` | M2 full pipeline |
| `sharing.spec.ts` | M8 URL round-trip |
| `params.spec.ts` | M5 param dialog (if not merged into vertical slice) |
| `versioning.spec.ts` | M6 revert flow |

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
- [ ] All E2E tests pass in CI on every push to main.
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
