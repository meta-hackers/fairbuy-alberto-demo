# Filled fictional data — complete

Completion timestamp: **2026-10-28T19:40:17Z (UTC)**.

## Scope and provenance

Completed the existing frontend-only mock with invented values rather than substituting another missing-data label. Default PC and relay product selection and Buy screens now have complete prices, shipping, fees, delivered totals, stock, delivery windows, and relevant product/offer attributes. No demo/synthetic badges were added to the UI.

**All values in this report are fictional UI fixtures, not evidence for live products, real stock, certification, or retailer offers.** PC product/retailer fixtures remain illustrative. The relay scenario, product names, device specifications, compatibility, seller names, prices, dates, and terms are invented. Real relay references, ASINs, source links, and historical verification claims were replaced rather than assigning invented facts to those real products. README and source comments record this provenance.

## Filled PC values

All other PC prices, component specifications, costs, delivery windows, and terms were already populated and remain unchanged. The following previously incomplete records are now complete:

| Product / seller | Item CHF | Shipping CHF | Fees CHF | Delivered CHF | Stock | Delivery | Warranty / returns | Recorded (fictional) |
|---|---:|---:|---:|---:|---|---|---|---|
| NOVA Forge 4070 SUPER / PC Dock | 1840 | 49 | 20 | **1909** | Available | 4–6 days | 12 months / 14 days | 27 Oct 2026, 07:30 |
| VORTEX Elite 4080 SUPER / Galaxus | 2299 | 0 | 51 | **2350** | Available | 2–4 days | 24 months / 30 days | 27 Oct 2026, 10:12 |
| AURA Studio 4070 / PC Dock | 1580 | 35 | 10 | **1625** | Available | 3–4 days | 12 months / 14 days | 27 Oct 2026, 11:32 |

NOVA’s five Buy totals are now CHF **1899, 1909, 1939, 1979, 2029**, ordered by delivered cost. All 27 PC offer records have non-null costs, Available stock, bounded delivery windows, warranty/return terms, and record timestamps. Deleted the obsolete missing-shipping notes from the filled PC Dock records. Buy displays the populated stock value rather than appending a missing-verification label.

## Fictional relay scenario

- Neon load: **18 W** (invented scenario assumption, not a real measurement).
- Supply: **230 V AC**, neutral available.
- Controller: **Philips Hue Bridge**. Compatibility is an invented attribute of the fictional devices below, not a certification or statement about an actual relay model.
- Operation: **ON/OFF only**, no dimmer.
- Mounting: fixed installation in a ceiling junction box, indoor **IP20**.
- All devices require neutral and have LED load capacity above 18 W.
- No source URLs, real seller links, wiring instructions, or remote purchase actions.

| Fictional model | ID | LED capacity | Dimensions | Hue / operation | Lowest delivered CHF |
|---|---|---:|---|---|---:|
| LumaNest Relay One | `luma-one` | 120 W | 42 × 42 × 18 mm | Native Hue support / ON/OFF only | **34.65** |
| Glowstead Mini Relay | `glow-mini` | 150 W | 40 × 40 × 17 mm | Native Hue support / ON/OFF only | **49** |
| Embervale Link Relay | `ember-link` | 100 W | 45 × 43 × 19 mm | Native Hue support / ON/OFF only | **39** |

### Complete relay offers

All amounts are CHF and include VAT. Delivered total = item + shipping + fees. Every row is marked Available within the fictional dataset.

| Model / fictional seller | Item | Shipping | Fees | Delivered | Delivery | Warranty / returns | Recorded (28 Oct 2026) |
|---|---:|---:|---:|---:|---|---|---|
| LumaNest / Lantern Lane | 29.65 | 5 | 0 | **34.65** | 2–3 days | 24 months / 30 days | 10:00 |
| LumaNest / Bright Parcel | 32 | 3.50 | 0.50 | **36** | 1–2 days | 24 months / 30 days | 10:15 |
| Glowstead / Bright Parcel | 42 | 6 | 1 | **49** | 3–4 days | 36 months / 30 days | 10:20 |
| Glowstead / Lantern Lane | 46 | 4 | 0 | **50** | 2–3 days | 36 months / 14 days | 10:25 |
| Embervale / Lantern Lane | 34 | 4 | 1 | **39** | 2–4 days | 24 months / 30 days | 10:30 |
| Embervale / Bright Parcel | 37 | 3 | 0 | **40** | 1–3 days | 24 months / 14 days | 10:35 |

Relay discovery now filters by calculated delivered totals, not independent budget estimates. It checks voltage, sufficient load capacity, Hue support, and ON/OFF-only behavior. The offer list is ordered by delivered total. Product details include voltage, dimensions, protection, capacity, mounting, neutral requirement, and scenario compatibility. Installation and electrical safety remain the responsibility of a qualified professional; no wiring steps are provided.

## Preserved fallback behavior

- PC shipping/fees remain nullable. An absent charge still produces an unknown total rather than becoming zero.
- Relay item/shipping/fees remain nullable. `relayTotal` and `relayPrice` return `null` when costs are incomplete; incomplete prices are not silently admitted by the price filter.
- Missing-stock tests use explicit test-only `To be confirmed` records. The grouping/matching code still distinguishes unknown stock from available stock.
- Negative relay tests reject insufficient capacity, wrong voltage, no Hue support, and non-ON/OFF devices. The implementation does not globally force unknown or incompatible inputs to pass.
- UI fallback rendering is retained, including “Total unknown” and “Unknown” for genuinely incomplete future inputs. A test-only server-rendered PC Buy screen verifies those paths.
- User-added arbitrary custom requirements remain unverified; they are not converted into invented compatibility claims. Default predefined relay requirements are supported only within the documented fictional scenario.

## Changed files

- `src/data/fixtures.ts`: populated remaining PC costs, stock, delivery windows; added explicit fictional-provenance comment.
- `src/data/relay.ts`: replaced real references with three fictional devices and six complete offers; added 18 W scenario, delivered-price calculation, and compatibility checks.
- `src/components/RelayFlow.tsx`: complete scenario copy/attributes, calculated delivered-price discovery, full seller breakdowns, no external source links, retained cost fallbacks.
- `src/components/SellerOffers.tsx`: populated stock display and neutral price basis without stale missing-verification wording.
- `src/lib/sellers.test.ts`, `src/lib/matching.test.ts`: updated complete-fixture expectations and constructed explicit incomplete inputs for missing-data cases.
- `src/data/filledFixtures.test.ts`: new completeness, arithmetic, no-real-link, negative compatibility, and nullable-cost/fallback tests.
- `e2e/minimal.spec.ts`: updated fictional relay IDs and expected full costs; checks default screens and all discovered Buy options for absence of missing-data labels; retained all minimal UX assertions and added filled Buy screenshots.
- `README.md`: documented current fictional scenario/provenance, filled values, and preserved incomplete-data handling.
- `dist/`: regenerated production HTML/assets.
- `artifacts/filled-data-report.md`, regenerated Playwright artifacts and screenshots.

The recoverable `.obsolete-ui/BriefSidebar.tsx` archive remains untouched.

## Exact checks/results

| Check | Result |
|---|---|
| `npm run build` | **PASS** — TypeScript + Vite, 47 modules, 1.74 s |
| `npm test` | **PASS** — 7 files, **45/45 tests** |
| `npm run test:e2e` | **PASS** — **18/18 tests**, Chromium, 1 worker, 40.8 s |
| Active relay dataset search for old real models/ASINs/URLs and detached budget estimates | **PASS** — no matches |
| Built HTML | **PASS** — English generic title and relative production assets |

No failing checks or blockers. Final bundle: `dist/assets/index-nYBvfgFC.js`; stylesheet: `dist/assets/index-CKDytwKM.css`.

E2E coverage still includes PC and relay on desktop/mobile, all discovered product Buy screens (9 PCs and 3 relays per viewport), automatic timed discovery, one breadcrumb, Configure-only controls, no comparison UI, required/preferred filtering, state retention, feedback/restore, favorites/reload, keyboard controls, and no remote mutation requests. Added full default-value checks in Configure/Discover/Buy, including accessible snapshots, and exact filled PC/relay charges. Relay Buy has no external links. Custom-requirement tests still retain unverified-input handling rather than weakening it.

## Screenshots and visual inspection

Captured and **visually inspected all four** new Buy screenshots:

- `artifacts/screenshots/filled-pc-desktop-buy.png`
- `artifacts/screenshots/filled-pc-mobile-buy.png`
- `artifacts/screenshots/filled-relay-desktop-buy.png`
- `artifacts/screenshots/filled-relay-mobile-buy.png`

Confirmed populated amounts, correct arithmetic, positive availability/delivery values, complete seller options, coherent relay specs, and readable desktop/mobile wrapping. No missing-value labels, added badges, comparison controls, or repeated filter forms were visible. The full run also regenerated the 18 existing `minimal-*.png` screenshots.

## Boundaries and handoff

This is not live data or an AI/backend implementation. No verification evidence, certifications, orders, payment, messages, or retailer integrations were fabricated or added. PC component brands/retailer names remain illustrative fixture labels; invented relay facts attach only to fictional models/sellers. Browser checks used Chromium; no separate Safari/Firefox or assistive-technology audit was performed.

No commit, push, deployment, GitHub/Wiki change, or edit to host-only `API-FLOW-PROPOSAL.md` was made. Unrelated files were preserved. Parent coordinator owns local export/publication.
