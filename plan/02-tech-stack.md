# Tech Stack

## Core

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Build / dev | **Vite + TypeScript** | Fast HMR, static output, trivial GitHub Pages deploy |
| UI framework | **React 19** | Modern state features, native ref/worker handling; fully compatible with React Flow |
| DAG canvas | **React Flow** (`@xyflow/react`) | De-facto standard for node/edge editors; pan/zoom/selection built-in |
| App state | **Zustand** | Lightweight; works cleanly with React Flow's controlled mode |
| Styling | **Tailwind CSS + shadcn/ui** | Fast path to modern, accessible UI components |
| Python runtime | **Pyodide** (Web Worker) | Client-side Pandas/NumPy without a backend |
| Worker RPC | **Comlink** | Ergonomic async RPC between main thread and worker |

## UI components

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Data grid (preview) | **glide-data-grid** | Virtualized; handles wide/tall tables smoothly |
| Code editor | **CodeMirror 6** | Lighter than Monaco; Python syntax highlighting |
| Charts (profiling) | **Observable Plot** or lightweight canvas | Histograms, distributions for profile panel |
| Icons | **lucide-react** | Consistent with shadcn/ui |

## Data & persistence

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Browser storage | **Dexie** (IndexedDB wrapper) | Stores datasets, workflows, version snapshots |
| Compression | **Native CompressionStream** (gzip) | Built-in browser API; zero bundle-size overhead, avoiding external libraries |
| URL encoding | **Native Base64** | Safe URL-safe base64 encoding/decoding via native `btoa`/`atob` and character replaces |

## Testing

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Unit tests | **Vitest** | Native Vite integration |
| Component tests | **React Testing Library** | User-centric component testing |
| E2E | **Playwright** | Full browser tests including Pyodide smoke tests |

## CI / deploy

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Linting | **ESLint + Prettier** | Consistent code style |
| CI | **GitHub Actions** | typecheck → lint → test → build → deploy |
| Hosting | **GitHub Pages** | Free static hosting; matches zero-backend constraint |

## Pyodide packages (v1)

| Package | Purpose |
|---------|---------|
| `pandas` | Core data manipulation |
| `numpy` | Numeric operations (Pandas dependency) |
| `micropip` | Runtime package loading if needed (optional; prefer `pyodide.loadPackage` for core packages to speed up cold start) |

## Explicitly not in v1

| Item | Reason |
|------|--------|
| `openpyxl` | Excel support deferred; adds bundle weight |
| Backend (Node, Python server) | Violates client-side-only constraint |
| Monaco Editor | Heavier than needed for read-only + light edit code view |
| Redux / MobX | Zustand is sufficient for this app's state shape |
| Arrow IPC | Only needed for >100 MB datasets (stretch) |
