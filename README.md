# RefineIt

RefineIt is a visual workspace for reusable data workflows. Build transformations as interactive flow diagrams, execute them locally in the browser using Python and Pandas, and share or export them as reproducible assets without managing infrastructure.

**Live demo:** [https://yuvallb.github.io/RefineIt/](https://yuvallb.github.io/RefineIt/)

---

## Quick start

1. Open the [live app](https://yuvallb.github.io/RefineIt/)
2. Use the **Open ▾** menu in the header (or the empty-canvas demo picker) to load a preset workflow, or drop a CSV/JSON file
3. Drag nodes from the palette, connect them, and inspect preview/profile/code
4. **Share** your workflow logic via URL (datasets stay local)
5. **Export** as Python script or Jupyter notebook

## Development

```bash
npm install
npm run dev          # http://localhost:5173/RefineIt/
npm run build        # production build → dist/
npm run preview      # preview production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test:unit    # Vitest unit tests
npm run test:integration  # Vitest browser (Pyodide)
npm run test:e2e     # Playwright E2E
```

Deployed to GitHub Pages on push to `main`.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected node or edge |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + N` | New workflow |
| `Ctrl/Cmd + S` | Save version (manual snapshot) |

Open **Help** in the footer for the full list.

## Features

- Visual DAG builder (CSV/JSON import → transforms → output)
- Pandas execution in a Web Worker (UI stays responsive)
- Live preview grid (capped at 100 rows) and column profiling
- Workflow parameters, versioning (save/revert/fork/compare)
- Shareable workflow URLs (gzip + base64url, logic only — no data)
- Export to `.py` or `.ipynb`
- Demo workflows and sample data in `public/demo/`

## Known limitations

- **Browser-only** — no server; all data stays on your machine unless you export
- **CSV and JSON import** — Excel (`.xlsx`) is not supported in v1
- **Target data size ~50–100 MB** — larger files may be slow; a warning appears above 50 MB
- **Share URLs contain workflow logic only** — recipients must upload their own datasets
- **No custom Python node** — transforms use the built-in node library
- **No dbt/SQL export** in v1
- **Chromium recommended** — Pyodide + SharedArrayBuffer; Safari/Firefox may vary

## Privacy

Imported datasets are stored in IndexedDB on your device. Shared URLs and exports contain workflow structure and parameters only — never your data files.

## Architecture

See [`plan/`](./plan/) for full design docs. Execution planning (topo sort, fingerprints, codegen) runs on the main thread; Pyodide in a Web Worker executes Python snippets and holds DataFrames.

## License

[Apache License 2.0](./LICENSE)