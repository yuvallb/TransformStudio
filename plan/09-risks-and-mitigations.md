# Risks & Mitigations

## R1: UI freezes during Python execution

| | |
|---|---|
| **Risk** | Pyodide execution blocks the main thread, making the canvas unresponsive |
| **Likelihood** | Certain if worker is not used |
| **Impact** | High — unusable app |
| **Mitigation** | Run all Python in a Web Worker via Comlink. Main thread only handles UI and lightweight JSON. |
| **Verification** | Playwright test: trigger execution, assert canvas remains interactive (pan/zoom) |

## R2: Large data transfer across worker boundary

| | |
|---|---|
| **Risk** | Passing full DataFrames between worker and main thread is slow and memory-doubling |
| **Likelihood** | Certain if previews include full data |
| **Impact** | High — slow previews, browser OOM |
| **Mitigation** | Worker returns only `head(N)` JSON previews. Full DataFrames never leave the worker. Cap preview at 100 rows. |
| **Verification** | Profile with 100 MB CSV; confirm no large ArrayBuffer transfers in DevTools Network/Memory |

## R3: Pyodide load time and bundle size

| | |
|---|---|
| **Risk** | Pyodide + pandas is ~8–15 MB; first visit has a long loading spinner |
| **Likelihood** | Certain |
| **Impact** | Medium — poor first impression |
| **Mitigation** | Lazy-load on first use (not on page load). Show progress bar. Cache via service worker for repeat visits. |
| **Verification** | Measure time-to-first-execution on cold and warm loads |

## R4: URL length limits for sharing

| | |
|---|---|
| **Risk** | Complex workflows produce JSON that exceeds browser URL/hash limits (~2 KB–64 KB depending on browser) |
| **Likelihood** | Medium — simple workflows fit; complex ones may not |
| **Impact** | Medium — sharing fails silently or truncates |
| **Mitigation** | gzip + base64url compression. Size guard with clear warning. `.tstudio.json` file export/import fallback. |
| **Verification** | Test sharing with 5, 20, 50, and 100 node workflows |

## R5: Browser memory limits

| | |
|---|---|
| **Risk** | 50–100 MB CSV loaded into Pandas may exceed browser tab memory (~1–2 GB practical limit) |
| **Likelihood** | Medium at upper bound |
| **Impact** | High — tab crash |
| **Mitigation** | Target 50 MB as comfortable, 100 MB as stretch. Show warning above 50 MB. Free worker variables on node delete. Consider chunked reading in stretch. |
| **Verification** | Load 50 MB and 100 MB CSVs on Chrome/Firefox/Safari; monitor memory in DevTools |

## R6: Schema evolution breaks saved workflows

| | |
|---|---|
| **Risk** | Changing the workflow schema invalidates saved workflows and shared URLs |
| **Likelihood** | Certain over time |
| **Impact** | High — data loss for users |
| **Mitigation** | `schemaVersion` field from day one. Migration functions (`v1 → v2 → ...`). Test migrations in CI. |
| **Verification** | Unit test: load a v1 workflow JSON through migration chain → valid current workflow |

## R7: Expression injection in Filter/Derive nodes

| | |
|---|---|
| **Risk** | User-supplied expressions passed to Python `eval()` could execute arbitrary code |
| **Likelihood** | Low in v1 (no custom Python node), but Filter/Derive use expressions |
| **Impact** | Medium — Pyodide sandbox limits damage, but still undesirable |
| **Mitigation** | Use Pandas `df.query()` or `df.eval()` with restricted scope (only column names + params). Do not use bare `exec()`. Custom Python node deferred. |
| **Verification** | Test that expressions with `import os` or `__import__` are rejected |

## R8: IndexedDB storage limits

| | |
|---|---|
| **Risk** | Browsers cap IndexedDB at ~50% of disk (varies); large datasets + many versions could fill quota |
| **Likelihood** | Low for typical usage |
| **Impact** | Medium — autosave fails |
| **Mitigation** | Store only raw file bytes (not DataFrames). Prune old versions (keep last N). Show storage usage in settings. |
| **Verification** | Import 5 × 50 MB files; confirm autosave still works or shows clear error |

## R9: GitHub Pages routing

| | |
|---|---|
| **Risk** | Client-side routes (e.g. `/w/abc123`) return 404 on refresh |
| **Likelihood** | Certain without fallback |
| **Impact** | Low — sharing uses hash-based URLs (`#w=...`), not path-based |
| **Mitigation** | Use hash-based routing for sharing (no server route needed). Add `404.html` → `index.html` redirect as safety net. Set Vite `base` correctly. |
| **Verification** | Deploy to Pages, open shared URL, refresh — workflow still loads |

## R10: dbt/SQL export fidelity

| | |
|---|---|
| **Risk** | Pandas operations don't map cleanly to SQL (window functions, complex derives, etc.) |
| **Likelihood** | Certain |
| **Impact** | Low — deferred to stretch |
| **Mitigation** | Not in v1. If pursued: clearly label as "best-effort", support only a subset of nodes, show warnings for unsupported operations. |

## R11: Pyodide Worker Crash / Out of Memory (OOM)

| | |
|---|---|
| **Risk** | Silently crashing the Web Worker or throwing uncatchable OOM errors during heavy operations or large file processing, hanging the UI in a permanent "running" state |
| **Likelihood** | Medium |
| **Impact** | High — app hang, loss of unsaved work |
| **Mitigation** | Implement worker heartbeat/ping mechanism and `onerror` listeners. Show a friendly toast on crash, automatically restart the worker, restore state from IndexedDB, and re-run active datasets. |
| **Verification** | Simulate worker crash in E2E tests (e.g., calling `self.close()` in worker); verify UI displays crash toast and successfully recovers. |

## R12: Browser Storage Quota Exceeded

| | |
|---|---|
| **Risk** | Storing multiple large datasets (50MB+ each) and their version history in IndexedDB exceeds the browser's storage quota, causing autosave or imports to fail |
| **Likelihood** | Medium |
| **Impact** | Medium — data loss, import failures |
| **Mitigation** | Implement dataset deduplication via content hashing (store the same file once) and a pruning/retention policy for old version snapshots. Use `navigator.storage.estimate()` to show storage usage and warn before limits are hit. |
| **Verification** | Import 5 × 50 MB files; verify storage usage is reported correctly and pruning triggers when nearing limits. |

## Risk priority matrix

```
Impact
  High │ R1 R2 R5 R6   R11    R4
       │ R3
  Med  │ R7 R8         R12    R9
       │
  Low  │                     R10
       └─────────────────────────
         Low    Med    High
              Likelihood
```

**Address first:** R1, R2, R6, R11 (architectural — must be right from M1/M2).
**Monitor:** R3, R4, R5, R12 (operational — mitigate with UX and guards).
**Defer:** R10 (stretch feature).
