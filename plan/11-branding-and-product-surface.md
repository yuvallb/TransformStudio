# Branding & Product Surface

Customer-facing identity, discovery, and trust elements for RefineIt — logo, messaging, external links, and first-run orientation.

**Related docs:** [UX-guidelines.md](./UX-guidelines.md) (header/footer layout), [07-milestones.md](./07-milestones.md) (M9 polish), [06-features.md](./06-features.md) (demo workflows).

---

## Goals

1. **Instant recognition** — Users know what app they are in within one glance (logo + name + tagline).
2. **Clear value proposition** — A short, honest explanation of what RefineIt is and why it is useful (local-first, no infra, shareable logic).
3. **Open-source discoverability** — Obvious paths to the GitHub repo and issue tracker for feedback and contributions.
4. **Trust & privacy** — Reinforce that data stays on-device; align with the zero-backend constraint.
5. **Low friction onboarding** — New visitors understand how to start without reading the README.

---

## Current state (as of M9)

| Element | Status |
|---------|--------|
| App name in header | ✅ "RefineIt" text label |
| Logo | ⚠️ Placeholder square with letter **"T"** (legacy from TransformStudio); favicon matches |
| Tagline | ❌ None |
| Product explanation | ⚠️ Minimal copy in empty-canvas `DemoPicker` only |
| GitHub link | ❌ None in UI |
| Report issue link | ❌ None in UI |
| About / Help dialog | ⚠️ `HelpDialog` covers shortcuts + diagnostics only |
| SEO / social meta | ⚠️ `index.html` has title only; no description or OG tags |
| Footer links | ⚠️ Pyodide status + Help button only |
| Version badge | ❌ None (package.json is `0.0.0`) |

The header wireframe in UX-guidelines shows `[R] RefineIt` — implementation should match that intent.

---

## Recommended scope tiers

### Tier A — Launch essentials (recommended for M9 completion)

Ship before calling the product "launch-ready." Small, static, no backend.

| ID | Feature | Effort |
|----|---------|--------|
| A1 | Brand logo (SVG) + favicon refresh | S |
| A2 | Tagline in header (truncated on narrow screens) | S |
| A3 | Centralized site config (repo URL, issue URL, tagline copy) | S |
| A4 | Header logo click → About dialog | M |
| A5 | About dialog: what / why / privacy / links | M |
| A6 | Footer link row: GitHub · Report issue · About | S |
| A7 | `index.html` meta description + OG tags | S |

**Estimated effort:** ~1–2 days.

### Tier B — Onboarding polish (recommended, same milestone or M9+)

| ID | Feature | Effort |
|----|---------|--------|
| B1 | Enrich empty-canvas welcome (`DemoPicker`) with tagline + value bullets | S |
| B2 | First-visit hint (dismissible, stored in `localStorage`) | S |
| B3 | Extend Help dialog with "Getting started" section + external doc link | S |
| B4 | App version badge in About (from `import.meta.env` / build inject) | S |



---

## Copy 

All user-visible strings should live in one config module so they are easy to edit and test.

### Tagline 

 *Visual data workflows that run in your browser*

Header displays tagline after the product name, muted, hidden below `md` breakpoint.

### One-sentence description (About dialog + meta description)

> RefineIt is a visual workspace for reusable data workflows. Users build transformations as interactive flow diagrams, execute them locally in the browser using Python and Pandas, and share or export them as reproducible assets without managing infrastructure.

### Value bullets (About + welcome card)


- **Runs entirely in your browser** — Python/Pandas in a Web Worker; your data never leaves your machine.
- **Visual DAG builder** — Drag, connect, and inspect live previews and column profiles.
- **Shareable logic** — Workflow URLs contain configuration only, not your datasets.
- **Export-ready** — Download as a Python script or Jupyter notebook.

### External URLs (canonical)

| Link | URL |
|------|-----|
| Repository | `https://github.com/yuvallb/RefineIt` |
| Report issue | `https://github.com/yuvallb/RefineIt/issues/new/choose` |

Use `target="_blank"` + `rel="noopener noreferrer"` for all external links.

---

## Feature specifications

### F11.1: Brand assets (A1)

**Logo concept:** Monogram **"R"** on a rounded square, emerald accent on dark/light backgrounds — consistent with UX status color (`#10B981` success / primary accent).

Deliverables:

| Asset | Path | Usage |
|-------|------|-------|
| App mark (SVG) | `public/logo.svg` | Header, About dialog, OG image source |
| Favicon | `public/favicon.svg` | Browser tab (replace current "T" mark) |
| Optional PNG | `public/og-image.png` | Open Graph preview (1200×630) |

Implementation:

- Create `src/ui/BrandLogo.tsx` — inline SVG or `<img src={...}>` with `alt="RefineIt"`; size variants `sm` (header) / `md` (About).
- Update `Header.tsx`: replace placeholder `T` badge with `<BrandLogo size="sm" />`.
- Logo is decorative in header when adjacent to "RefineIt" text — use `aria-hidden` on mark, keep text label for screen readers.

**Design constraint:** Single-color mark that works in light and dark mode (use CSS `currentColor` or theme tokens).

---

### F11.2: Site config module (A3)

Centralize strings and URLs:

```typescript
// src/lib/site-config.ts
export const SITE = {
  name: 'RefineIt',
  tagline: 'Visual data workflows that run in your browser',
  description: '...', // one-sentence
  urls: {
    repo: 'https://github.com/yuvallb/RefineIt',
    issues: 'https://github.com/yuvallb/RefineIt/issues/new/choose',
  },
  valueProps: [ /* bullet strings */ ],
} as const;
```

- No runtime fetching; static constants only.
- Unit test: assert URLs are valid HTTPS and issue URL contains `/issues`.

---

### F11.3: Header brand row (A2, A4)

**Layout (extends existing header left cluster):**

```
[Logo] RefineIt · <tagline>     — <workflow name>   [WorkflowSwitcher] …
```

| Behavior | Detail |
|----------|--------|
| Tagline | `text-muted-foreground text-xs`, `hidden lg:inline` |
| Logo + name click | Opens About dialog (not navigation away from workspace) |
| Narrow screens | Logo + "RefineIt" only; tagline omitted |

Do not grow header height beyond `h-12`.

---

### F11.4: About dialog (A4, A5)

New component: `src/ui/AboutDialog.tsx`.

**Trigger surfaces:**

- Click logo / product name in header
- Footer "About" link
- Optional: first-visit welcome "Learn more" link

**Content sections:**

1. **Header** — Large logo + name + tagline
2. **What is RefineIt?** — One-sentence description (from `SITE.description`)
3. **Why RefineIt?** — Value bullets (`SITE.valueProps`)
4. **Privacy** — "Imported datasets stay in your browser (IndexedDB). Shared links never include your files."
5. **Links** — Button group or link list:
   - View on GitHub (repo)
   - Report an issue
6. **Footer** — App version (if B4 done) + license note ("Open source — see repository for license")

Use existing shadcn `Dialog`; match Help dialog width (`max-w-md` or slightly wider `max-w-lg` for bullets).

**State:** `aboutDialogOpen` in `ui-store` (same pattern as `helpDialogOpen`).

---

### F11.5: Footer external links (A6)

Extend `Footer.tsx` right cluster:

```
[Pyodide status …]     [rows × cols]   GitHub · Issues · About · Help
```

| Link | Icon (lucide) | Notes |
|------|---------------|-------|
| GitHub | `Github` | External |
| Issues | `Bug` or `MessageSquareWarning` | External; label "Report issue" |
| About | — | Opens About dialog |
| Help | — | Existing Help button |

Style: `text-xs text-muted-foreground hover:text-foreground`, ghost buttons or plain `<a>`.

On very narrow viewports, collapse to icon-only with `aria-label`.

---

### F11.6: SEO & social meta (A7)

Update `index.html` (or inject via Vite `html` plugin if preferred):

```html
<meta name="description" content="…" />
<meta property="og:title" content="RefineIt" />
<meta property="og:description" content="…" />
<meta property="og:url" content="https://yuvallb.github.io/RefineIt/" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://yuvallb.github.io/RefineIt/og-image.png" />
<meta name="twitter:card" content="summary" />
```

Keep title `RefineIt`. Description must match `SITE.description` (single source — consider build-time replace or duplicate with a comment pointing to `site-config.ts`).

---

### F11.7: Welcome / empty state enrichment (B1, B2)

Enhance `DemoPicker.tsx` (shown when canvas has zero nodes):

**Above demo buttons:**

- Product name + tagline
- 2-line value summary (subset of value props)
- "Learn more" → About dialog

**First-visit hint (B2):**

- Key: `refineit.dismissedWelcomeHint` in `localStorage`
- Small dismissible banner above canvas or inside welcome card: *"Drop a CSV/JSON file anywhere on the canvas to start."*
- Do not block interaction; no modal on first load

---

### F11.8: Help dialog extension (B3)

Add a "Getting started" section above shortcuts in `HelpDialog.tsx`:

1. Open a demo or import a file
2. Connect nodes on the canvas
3. Inspect preview, profile, and generated code
4. Share workflow logic or export Python/notebook

Link: "Full documentation on GitHub →" (`SITE.urls.readme`).

---

### F11.9: Version badge (B4)

Inject build version at compile time:

```typescript
// vite.config.ts — define __APP_VERSION__
define: {
  __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
}
```

Show in About dialog footer: `v0.1.0` (bump `package.json` version when branding ships).

Optional: append short git SHA in CI via env var — defer unless needed.

---

## File plan

| Action | Path |
|--------|------|
| Create | `src/lib/site-config.ts` |
| Create | `src/ui/BrandLogo.tsx` |
| Create | `src/ui/AboutDialog.tsx` |
| Create | `public/logo.svg` |
| Update | `public/favicon.svg` |
| Update | `src/app/layout/Header.tsx` |
| Update | `src/app/layout/Footer.tsx` |
| Update | `src/ui/HelpDialog.tsx` |
| Update | `src/ui/DemoPicker.tsx` |
| Update | `src/state/ui-store.ts` (`aboutDialogOpen`) |
| Update | `index.html` (meta tags) |
| Optional | `public/og-image.png` |
| Create | `tests/unit/site-config.test.ts` |

---

## Milestone placement

| Tier | Milestone | Rationale |
|------|-----------|-----------|
| **A (essentials)** | **M9** — Hardening & launch | Launch DoD includes README/screenshots; in-app identity should match |
| **B (onboarding)** | **M9** or immediate follow-up | Empty state already exists; low incremental cost |
| **C** | Post-launch / on request | Avoid scope creep before E2E green |

### Suggested M9 task additions

Add to [07-milestones.md](./07-milestones.md) M9 tasks (when approved):

- [ ] Brand logo + favicon; replace header placeholder
- [ ] About dialog with product copy and GitHub/issue links
- [ ] Footer external links; meta/OG tags
- [ ] Enrich demo welcome card with tagline and value props

---

## Definition of Done

### Tier A

- [ ] Header shows RefineIt logo (R mark), name, and tagline (desktop)
- [ ] Favicon matches logo; no "T" placeholder remains
- [ ] Clicking logo/name opens About dialog with description, value props, privacy note
- [ ] Footer has working GitHub and Report issue links (new tab)
- [ ] `index.html` includes meta description and Open Graph tags
- [ ] All copy sourced from `site-config.ts`
- [ ] `npm run lint`, `typecheck`, `test:unit`, `build` pass

### Tier B

- [ ] Empty canvas welcome shows tagline + brief value summary
- [ ] First-visit hint dismisses and does not reappear after dismiss
- [ ] Help dialog includes Getting started steps + README link
- [ ] About shows app version

### Manual QA

- [ ] Light and dark mode: logo and links readable
- [ ] Mobile width: header/footer do not overflow; icon-only links OK
- [ ] External links open correct GitHub pages
- [ ] Screen reader: product name announced; decorative logo hidden

---

## Testing

| Layer | What |
|-------|------|
| Unit | `site-config` URL shape; optional snapshot of value prop count |
| Component | `AboutDialog` renders links with correct `href` (RTL) |
| E2E (optional) | Footer GitHub link has expected hostname; About opens from header click |

No snapshot tests for logo pixels.

---

## Out of scope

- Backend analytics or telemetry
- In-app feedback form (use GitHub Issues)
- User accounts, newsletter, or cookie banner (no tracking cookies in v1)
- Rebrand to a different product name
- i18n / localization

---


2. **Logo design** —  simple "R" monogram 
4. **Issue template** — Add `.github/ISSUE_TEMPLATE/bug_report.yml` so "Report issue" lands on a useful form

---

## Implementation order
 
```
1. site-config.ts + unit test
2. logo.svg + favicon.svg + BrandLogo.tsx
3. AboutDialog + ui-store flag
4. Header + Footer wiring
5. index.html meta tags
6. DemoPicker + HelpDialog enrichment (Tier B)
7. Version inject + package.json bump
```

Steps 1–5 deliver Tier A; 6–7 complete Tier B.
