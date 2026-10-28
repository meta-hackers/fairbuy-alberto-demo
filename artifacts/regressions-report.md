# FairBuy — regressions and second mock flow report

**Result: FINISHED** · Project: `/workspace/fairbuy-alberto-demo` · Date: 2026-10-28

No commit, push, deployment, publication, or remote change was performed. This folder is not a Git checkout; publication remains with the host operator.

## Delivered

### Existing PC demo repaired

- Restored the complete six-stage bar: **ASK → CONFIGURE → DISCOVER → LEARN → CHOOSE → COMPARE**. Configure/discover/learn are gated until the two-message reveal. Choose explains that a product must first be opened; compare explains that two products must first be selected. Learn shows the exclusion/feedback ledger. The existing offers detail is CHOOSE; Compare opens the existing comparison UI.
- The six stages fit in two rows on narrow mobile layouts. Playwright checked 320, 360, 390 and 1280 px, button bounds, and document horizontal overflow.
- Product cards now initially show only product name, cheapest confirmed delivered fixture price (or an explicit unconfirmed-price label), and a disclosure affordance. Click, touch, Enter, and Space expand inline detail and existing actions. Multiple rows may stay expanded. Existing seller-offer range is retained in detail.
- Reconnected the accessible expanded-card **Escludi con motivo** action to `DismissModal`. Cancel/Escape leave the item untouched. Users can choose reasons, enter a free note, or skip without a reason. Apply records visible feedback and removes the item; active exclusions are kept out of later results and searches after filter changes.
- LEARN lists active and undone feedback. Undo restores eligibility, notifies the user, and returns the item only if current filters allow it. RAM/GPU clarifications alter the corresponding visible characteristic only on an explicit selection. “Solo una preferenza” is represented visibly and remains non-filtering; no implicit hard requirements are introduced. Other reasons and free notes are recorded without hidden filter changes.
- Preserved the empty ASK, exact second-message reveal, editable characteristics, dual-thumb keyboard price range, 2-second progressive discovery, offers, compare, and favorites.

### Separate smart relay mock demo

- Category routing runs only on the first user message (or the explicit category answer after ambiguous input). Whole-word `switch`/`interruttore` routes to the separate relay demo. Whole-word `PC`/`computer` routes to PC; unrelated first messages retain the PC fallback. Nintendo/network/PC-plus-switch ambiguity asks which category. Later conversation never silently changes the chosen category; reset starts a new route.
- The relay demo has its own empty/seeded ASK path, exact second-user reveal, editable mock characteristics, price range, progressive discovery, compact expandable candidates, feedback/undo, CHOOSE references, and COMPARE.
- Relay characteristics cover declared native Philips Hue Bridge compatibility, ON/OFF only / no dimmer as an unverified requirement, 230 V AC, L+N neutral, ceiling junction box (not behind wall switch), fixed wiring (not plug), and **actual neon load UNKNOWN**.
- Historical supplied research is clearly identified as unverified. LED Trading is referenced by ASIN B08Q3HF3HJ and historical ~CHF 29.65, with 200 W LED / 1.5 A labeled as cited module capacity, not measured neon load. The source’s conflicting “dimmer” wording is surfaced; no no-dimmer certification is claimed. Dimensions/IP20 are attributed to that historical research. Iluminize 5120.2 and Gledopto ON/OFF are listed as candidates requiring exact model/Hue/capability verification. Mock totals are labeled as synthetic test values, not live offers or confirmed delivered prices.
- Hue Smart Plug CH is described as excluded for this fixed-wired scenario. Sonoff ZBMINIR2/ZBMINIL2, MiBoxer PZ2, EMOS GoSmart, and Shelly Gen4 are named only as rejected by the supplied historical research, with rejection grounds explicitly unverified. No broad protocol incompatibility is asserted.
- Reference links included: supplied Amazon product page, LED Trading PDF, iConnectHue supported-device page, and candidate manufacturer pages. No live offer lookup is performed. No wiring instructions are provided; the interface recommends qualified professional verification.

## Exact verification

| Command | Final result |
|---|---|
| `npm run build` | **PASS** — TypeScript clean; Vite built 48 modules; JS 297.04 kB (91.11 kB gzip), CSS 28.42 kB (6.32 kB gzip); `dist/` regenerated with relative assets |
| `npm test` | **PASS** — 5 files, 38/38 unit tests |
| `npm run test:e2e` | **PASS** — 19/19 Playwright tests, 44.3 s, Chromium |

E2E coverage includes the original ASK/two-message flow, exact reveal, slider, timed discovery, filter restarts, plus PC compact height/disclosure by keyboard, dismissal cancel/reason/note/skip behavior, exclusion persistence through navigation and price-filter restart, undo, explicit soft clarification, all six stage bounds at 320/360/390/1280 px, relay category route and reveal, unknown actual neon load, capacity-vs-load wording, relay Configure/Discover timing and expanded candidate detail. No failures or skipped tests in the final run.

## Files changed

New:
- `src/components/FeedbackLog.tsx`
- `src/components/RelayFlow.tsx`
- `src/data/relay.ts`
- `src/lib/category.ts`
- `src/lib/category.test.ts`
- `src/lib/feedback.ts`
- `artifacts/regressions-report.md`

Updated:
- `src/App.tsx`
- `src/components/StageProgress.tsx`
- `src/components/ProductCard.tsx`
- `src/components/DismissModal.tsx`
- `src/components/ChatPanel.tsx`
- `src/lib/flow.ts`
- `src/lib/flow.test.ts`
- `src/styles.css`
- `e2e/ask-free-text.spec.ts`
- `e2e/smoke.spec.ts`
- `README.md`
- `dist/index.html` and generated `dist/assets/*`

## Screenshots

- Desktop PC: `artifacts/screenshots/pc-card-collapsed.png`, `pc-card-expanded.png`
- Six-stage layouts: `artifacts/screenshots/stages-320.png`, `stages-360.png`, `stages-390.png`, `stages-1280.png`
- Relay: `artifacts/screenshots/relay-configure.png`, `relay-discover-expanded.png`
- Existing ASK/configure/discovery and mobile screenshots remain in `artifacts/screenshots/`.

## Caveats

- Entire application and catalog are synthetic; no AI, backend, network research, or current seller availability is represented.
- Relay module history, native Hue compatibility, device capability, dimensions, IP rating, and prices are unverified historical assertions. The supplied source itself conflicts about dimming capability; confirm exact SKU and load with the manufacturer/qualified electrician before any real-world decision.
- Relay candidate price filter uses explicitly mock totals. It does not represent an actual cheapest confirmed delivered price.
- Feedback/exclusion persistence is app-session state across stages and restarts/search filter edits; resetting the demo intentionally clears it.
- No commits, pushes, or publication/deployment from the container.

**Final status: FINISHED.** All required build, unit, and E2E checks pass.
