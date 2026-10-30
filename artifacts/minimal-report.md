# Minimal shopping UI — complete

Completion timestamp: **2026-10-28T19:19:32Z (UTC)**

## Result

- Product-generic FairBuy framing, English copy, and restrained light layout; no PC-specific hero.
- Exactly one top breadcrumb: **Ask › Configure › Discover › Learn › Buy**. Left navigation and the final comparison phase are removed.
- Removed comparison components, state, controls, and styles in both categories. No replacement comparison feature.
- Removed visible demo/synthetic badges and repeated mock/scripted disclaimers, including page metadata, conversation labels, and accessibility text on rendered screens. Implementation boundaries remain explicit in `README.md`.
- Ask remains initially empty. Category routing retains `pc`, `computer`, `switch`, and `interruttore`, plus explicit ambiguity handling. Later messages cannot silently change category.
- Configuration is only in Configure. Required/preferred GPU and RAM controls are explicit and coherent: required targets filter; preferred targets allow trade-offs. The duplicated priority label suffix was removed from presentation.
- Discover starts automatically on entry, one option every two seconds. Returning resumes; edited configuration restarts. No start-search button, duplicate requirements form/list, or repeated price slider in Discover.
- Buy requires a selected product and shows its details and read-only seller/source options. PC options include item, shipping, fees, total, recorded availability, delivery, terms, and timestamps. Unknown charges remain unknown rather than being treated as zero. Relay options distinguish historical prices and manufacturer references from current offers. Clear back navigation to Discover; no filters or checkout.
- Preserved compact disclosure cards, favorites, explicit exclusion feedback, notes, Learn restoration, navigation state, and keyboard controls. Closing feedback returns focus; dialogs contain keyboard focus. Favorites persist across new searches and reloads; other state persists across navigation only.
- Preserved relay consumption, exact-model Hue compatibility, and ON/OFF-only uncertainties. Cited capacity is never represented as the actual neon load. Historical CHF 29.65 is displayed without rounding away cents.

## Changed files

Modified:

- `src/App.tsx`
- `src/components/StageProgress.tsx`
- `src/components/ChatPanel.tsx`
- `src/components/CharacteristicsPanel.tsx`
- `src/components/ProductCard.tsx`
- `src/components/SellerOffers.tsx`
- `src/components/RelayFlow.tsx`
- `src/components/FeedbackLog.tsx`
- `src/components/DismissModal.tsx`
- `src/components/ProductIllustration.tsx` (accessible illustration text)
- `src/data/fixtures.ts` (removed stale visible wording)
- `src/data/relay.ts`
- `src/lib/flow.ts`
- `src/lib/mockReplies.ts`
- `src/lib/sellers.ts`
- `src/lib/flow.test.ts`
- `src/lib/mockReplies.test.ts`
- `src/lib/sellers.test.ts`
- `src/styles.css`
- `index.html`
- `README.md`

Added:

- `src/components/ShoppingShell.tsx`
- `src/lib/feedback.test.ts`
- `e2e/minimal.spec.ts`
- `artifacts/minimal-report.md`

Removed as obsolete:

- `src/components/CompareTray.tsx`
- `e2e/ask-free-text.spec.ts`
- `e2e/smoke.spec.ts`

Regenerated:

- `dist/index.html`
- `dist/assets/index-CKDytwKM.css`
- `dist/assets/index-DZfNLm23.js`
- `artifacts/playwright-report/` and Playwright test results
- The 18 `minimal-*.png` screenshots listed below (older historical screenshots were retained).

## Exact checks

Final runs:

| Command/check | Result |
|---|---|
| `npm run build` | **PASS** — TypeScript check and Vite production build; 47 modules; 1.66 s |
| `npm test` | **PASS** — 6 files, **42/42 unit tests** |
| `npm run test:e2e` | **PASS** — **14/14 Playwright tests**, Chromium, 1 worker, 26.2 s |
| Source search for obsolete comparison state/imports/phases | **PASS** — no matches for `CompareTray`, `CompareModal`, `compareIds`, `onCompare`, old product/compare stage conditions, `canChoose`, or `canCompare` |
| Built HTML review | **PASS** — `lang="en"`, generic title/description, relative production assets |

The first E2E run had **8 passed / 4 failed**: all four failures were feedback-dialog focus-return assertions under the paused test clock. Focus return was made synchronous in both flows. The subsequent 12-test suite passed; the expanded final 14-test suite also passed. **No outstanding failures or blockers.**

E2E coverage includes:

- PC and relay workflows at desktop **1440 × 1000** and mobile **390 × 844**.
- Initial empty chat, two-message readiness, locked Buy without selection, keyboard composer, and routing clarification.
- One navigation and exactly five breadcrumb items; no comparison controls or rendered demo/synthetic/mock/scripted labels (including visible aria/title attributes and document title).
- Configure-only forms, automatic 1999/2000 ms discovery, no extra start step, pause/resume without duplicates, and restart after edits.
- Buy selection, PC five-offer breakdown with unknown totals, relay historical/source options and unknown delivered costs, back navigation, and absence of filters.
- Favorites, exclusion reasons/notes, Escape/focus return, restoration, later-edit preservation, required/preferred filtering, empty-state recovery, and no non-GET/HEAD requests in both category journeys.
- Responsive overflow and visible breadcrumb at **320, 360, 390, and 1440 px**.

## Screenshots

All are in `artifacts/screenshots/`:

- `minimal-ask-1440.png`
- `minimal-ask-390.png`
- `minimal-pc-desktop-configure.png`
- `minimal-pc-desktop-discover.png`
- `minimal-pc-desktop-buy.png`
- `minimal-pc-desktop-learn.png`
- `minimal-pc-mobile-configure.png`
- `minimal-pc-mobile-discover.png`
- `minimal-pc-mobile-buy.png`
- `minimal-pc-mobile-learn.png`
- `minimal-relay-desktop-configure.png`
- `minimal-relay-desktop-discover.png`
- `minimal-relay-desktop-buy.png`
- `minimal-relay-desktop-learn.png`
- `minimal-relay-mobile-configure.png`
- `minimal-relay-mobile-discover.png`
- `minimal-relay-mobile-buy.png`
- `minimal-relay-mobile-learn.png`

Visually inspected the mobile empty Ask, desktop PC Discover, PC Buy desktop/mobile, PC Configure mobile, relay Configure mobile, relay Discover mobile, relay Buy desktop, and PC Learn mobile. Checked compact breadcrumb, readable wrapping, cohesive spacing, no duplicated side panels, and clear unknowns. The Configure priority labels were simplified after inspection; final screenshots were regenerated. Latest relay Buy screenshot was inspected again to verify CHF 29.65 precision.

## Limitations and handoff

- This is still a deterministic, frontend-only mock. PC stock/prices/terms are invented fixtures, not verified retailer facts; relay planning estimates are not real delivered totals. No live research was performed.
- AI interpretation is future server-side work. The current first/second-message behavior uses predefined requirements; free text does not extract or change requirements. Unsupported input receives a clear fallback.
- No checkout, orders, payment, seller messaging, remote mutations, or retailer integrations were added. Relay links are read-only reference links; unknown compatibility/load/safety must be verified by a qualified professional.
- Browser testing used Chromium only; no separate Safari/Firefox or assistive-technology audit was performed.
- No applicable `AGENTS.md` files were present. This workspace is not a Git repository, so no Git diff/status baseline was available; existing source was inspected before changes.
- No commit, push, deployment, GitHub action, or Wiki edit was performed. Host-only `API-FLOW-PROPOSAL.md` was not accessed, overwritten, or deleted. Export/publication remains with the parent coordinator.

## Review follow-up

Status: **Complete**. New completion timestamp: **2026-10-28T19:29:23Z (UTC)**.

### Fixes

1. Removed remaining fixture-honesty labels from business copy:
   - `src/data/fixtures.ts`: `seller` is now exactly the retailer name.
   - `src/lib/sellers.ts`: price basis is **“Delivered totals shown · VAT included”**, without verification or synthetic-data claims.
   - `src/lib/matching.ts`: removed the synthetic-fixture reason; the delivered-price reason now says “Lowest delivered total shown”. Unknown/evidence warnings are unchanged.
   - `src/components/SellerOffers.tsx`: uses the actual seller field and renders the neutral basis alongside the existing reference-price/availability warning. This makes regression checks cover the business fields themselves rather than bypassing them with retailer-only rendering.
   - Extended `src/lib/sellers.test.ts` and `src/lib/matching.test.ts` to check the plain seller fields, exact neutral basis, and absence of prohibited wording across all product match explanations.
   - Strengthened `e2e/minimal.spec.ts`: accessibility snapshots check computed accessible names as well as rendered text and explicit aria/title attributes. Four new desktop/mobile PC/relay cases visit **every discovered product** (9 PCs and 3 relays per viewport), check Discover and Buy, inspect every seller/source row, and explicitly check the rendered offer basis and seller values. Case-insensitive `synthetic`/`demo`/`mock`/`scripted` checks are not limited to the first offer or viewport. Existing UX assertions remain intact.
2. Archived unused sidebar:
   - Moved `src/components/BriefSidebar.tsx` to **`.obsolete-ui/BriefSidebar.tsx`**, within the project and recoverable. Only its relative data-type import was adjusted for the new location; its archived contents remain intact.
   - No active source imports or renders `BriefSidebar`. The archive is outside the TypeScript `src` include and production import graph.
   - **Retained `src/components/PriceRangeSlider.tsx`**: it is imported and rendered by both `src/App.tsx` and `src/components/RelayFlow.tsx` in Configure. E2E checks continue to assert exactly one slider in Configure and none in Discover/Buy.

### Exact checks/results

| Command/check | Follow-up result |
|---|---|
| `npm run build` | **PASS** — TypeScript and Vite, 47 modules, 1.69 s |
| `npm test` | **PASS** — 6 files, **42/42 tests** |
| `npm run test:e2e` | **PASS** — **18/18 tests**, Chromium, 1 worker, 39.5 s |
| Active source search for prohibited wording | **PASS** — remaining occurrences are internal comments, test patterns/names, and the existing localStorage key; no business-copy labels remain |
| Sidebar and slider reference inspection | **PASS** — sidebar archived; both Configure flows still render the slider |

No failing checks or blockers in this follow-up. `dist/` was rebuilt; current assets are `dist/assets/index-n8_tXz99.js` and `dist/assets/index-CKDytwKM.css`, referenced by `dist/index.html`.

### Screenshots and inspection

The full E2E run regenerated all 18 `artifacts/screenshots/minimal-*.png` screenshots. Visually inspected the following regenerated Buy screenshots, including the requested files and all Buy variants showing seller/basis information:

- `artifacts/screenshots/minimal-pc-desktop-buy.png`
- `artifacts/screenshots/minimal-pc-mobile-buy.png`
- `artifacts/screenshots/minimal-relay-desktop-buy.png`
- `artifacts/screenshots/minimal-relay-mobile-buy.png`

Confirmed plain PC seller names, the neutral delivered-total basis, readable wrapping, retained unknown-cost/current-availability warnings, relay CHF 29.65 historical pricing and unknown delivered total, and no visible fixture/demo labels. No layout or warning regressions observed.

Implementation limitations remain as documented above: deterministic local fixtures, no live stock/checkout/integrations, relay evidence unverified, Chromium-only verification. No commit, push, deployment, GitHub/Wiki changes, or changes to host-only `API-FLOW-PROPOSAL.md` were made.
