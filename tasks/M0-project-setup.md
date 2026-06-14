# M0: Project Setup

**Goal:** Runnable project skeleton with CI and GitHub Pages deployment.

**Prerequisites:** None (starting milestone).

**Estimated effort:** 1x

---

## Task 1: Initialize Vite + React + TypeScript project

### Implementation

- Scaffold with `npm create vite@latest . -- --template react-ts` (or equivalent in empty repo).
- Use **React 19** (confirmed in [`plan/README.md`](../plan/README.md)).
- Configure path aliases in `tsconfig.json` and `vite.config.ts` (e.g. `@/` → `src/`).
- Create minimal entry structure per [`plan/08-repo-structure.md`](../plan/08-repo-structure.md):
  - `src/app/main.tsx`, `src/app/App.tsx`
  - `src/lib/types.ts`, `src/lib/constants.ts`, `src/lib/utils.ts` (stubs)
- Set `strict: true` in TypeScript config.

### Files

| Action | Path |
|--------|------|
| Create | `src/app/main.tsx`, `src/app/App.tsx` |
| Create | `src/lib/types.ts`, `constants.ts`, `utils.ts` |
| Configure | `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json` |

---

## Task 2: Tailwind CSS + shadcn/ui

### Implementation

- Install and configure Tailwind CSS v4 (or v3 per shadcn compatibility at setup time).
- Initialize shadcn/ui with the project's design tokens.
- Add required components: **Button**, **Dialog**, **Input**, **Select**, **Tabs**, **Toast** (Sonner or shadcn toast).
- Place shadcn components under `src/ui/components/`.
- Add `components.json` for shadcn CLI.

### Files

| Action | Path |
|--------|------|
| Configure | `tailwind.config.ts`, `postcss.config.js`, `src/index.css` |
| Create | `src/ui/components/ui/*` (shadcn generated) |
| Create | `components.json` |

---

## Task 3: ESLint + Prettier

### Implementation

- ESLint with TypeScript, React, and React Hooks plugins.
- Prettier integration (`eslint-config-prettier`).
- Add npm scripts: `lint`, `lint:fix`, `format`.
- Optional: pre-commit hook (only if user requests; not required for M0 DoD).

### Files

| Action | Path |
|--------|------|
| Configure | `eslint.config.js` (or `.eslintrc`), `.prettierrc`, `.prettierignore` |

---

## Task 4: Vitest + React Testing Library

### Implementation

- Configure Vitest in `vite.config.ts` with `environment: 'jsdom'` for component tests.
- Install `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- Add `tests/setup.ts` with jest-dom matchers.
- Add npm script: `test:unit`.
- Write one smoke test: App renders without crashing.

### Files

| Action | Path |
|--------|------|
| Configure | `vite.config.ts` (test block) |
| Create | `tests/setup.ts`, `tests/unit/app/App.test.tsx` |

---

## Task 5: Playwright E2E setup

### Implementation

- `npm init playwright@latest` with Chromium only for CI.
- Configure `baseURL` for local dev and GitHub Pages path.
- Add npm script: `test:e2e`.
- Write placeholder spec that loads the app and asserts title/header exists.

### Files

| Action | Path |
|--------|------|
| Configure | `playwright.config.ts` |
| Create | `tests/e2e/app-loads.spec.ts` |

---

## Task 6: GitHub Pages configuration

### Implementation

- Set Vite `base: '/TransformStudio/'` in `vite.config.ts`.
- Create `public/404.html` SPA fallback (copy of `index.html` with redirect script for GitHub Pages).
- Ensure asset paths resolve correctly under subpath.

### Files

| Action | Path |
|--------|------|
| Configure | `vite.config.ts` (`base`) |
| Create | `public/404.html` |

---

## Task 7: GitHub Actions CI/CD

### Implementation

- Workflow file: lint → typecheck → test:unit → build → deploy to GitHub Pages.
- Use `actions/setup-node` with npm cache.
- Deploy job needs `pages: write` and `id-token: write` permissions.
- Trigger on push to `main`.
- Add npm script: `typecheck` (`tsc --noEmit`).

### Files

| Action | Path |
|--------|------|
| Create | `.github/workflows/deploy.yml` |

---

## Task 8: Basic app shell

### Implementation

- Three-region layout stub per [`plan/UX-guidelines.md`](../plan/UX-guidelines.md):
  - **Header:** logo/title, placeholder action buttons (Share, Export — disabled)
  - **Main:** empty workspace area with "Transform Studio" placeholder
  - **Footer:** status bar stub ("Ready")
- Create layout components:
  - `src/app/layout/Header.tsx`
  - `src/app/layout/Sidebar.tsx` (empty palette placeholder)
  - `src/app/layout/Footer.tsx`
- Use Tailwind for responsive grid; dark/light mode optional (defer polish to M9).

### Files

| Action | Path |
|--------|------|
| Create | `src/app/layout/Header.tsx`, `Sidebar.tsx`, `Footer.tsx` |
| Update | `src/app/App.tsx` |

---

## Task 9: Package scripts and documentation stubs

### Implementation

- Standardize `package.json` scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test:unit": "vitest run",
  "test:e2e": "playwright test"
}
```

- Add `.gitignore` for `node_modules`, `dist`, Playwright artifacts.
- Ensure root `README.md` mentions local dev commands (full README update deferred to M9).

---

## Testing requirements

| Layer | What to test | File |
|-------|--------------|------|
| Unit | App renders header/footer | `tests/unit/app/App.test.tsx` |
| E2E | Page loads, no console errors | `tests/e2e/app-loads.spec.ts` |
| CI | All jobs green on push to main | `.github/workflows/deploy.yml` |

No integration or Pyodide tests in M0.

---

## Acceptance criteria

### Definition of Done

- [ ] `npm run dev` starts the app locally without errors.
- [ ] `npm run build` produces static output in `dist/`.
- [ ] `npm run lint` and `npm run typecheck` pass.
- [ ] `npm run test:unit` passes.
- [ ] `npm run test:e2e` passes (app load smoke).
- [ ] GitHub Actions runs lint → typecheck → test → build → deploy on push to `main`.
- [ ] Deployed app loads at `https://<user>.github.io/TransformStudio/` (blank shell with header/footer).
- [ ] SPA routing works (404.html fallback redirects to index).

### Manual verification

1. Open deployed URL — header, empty main area, footer visible.
2. Open DevTools — no critical console errors on load.
3. Confirm `dist/` assets use `/TransformStudio/` prefix.

---

## Verification checklist

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

All must pass before starting M1.

---

## Out of scope (do not implement)

- Pyodide, React Flow, Zustand stores, Dexie
- Any node types or execution engine
- Full UX polish, demo data, service worker
