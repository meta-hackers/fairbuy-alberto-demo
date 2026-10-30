# FairBuy — new product flow implementation report

**Date:** 2026-10-30 UTC  
**Project:** `/workspace/fairbuy-alberto-demo`  
**Result:** working implementation, unit tests, production build and desktop/mobile Playwright checks passing.

No Git repository was created, and no commit, push, deployment, GitHub mutation, or external backend was added.

## Delivered flow

The active journey is now **Ask → Configure → Discover ↔ Learn → Buy** for both the PC and smart-relay scenarios.

### Ask

- Remains an unstructured chat. There is no structured wizard and no forced budget form.
- Requirements are extracted from the actual user text. Different wording produces different requirements rather than a fixed default second-turn set.
- Supports PC details such as gaming/creative/streaming/coding use, resolution, RAM, GPU, condition, quiet, compact, value and custom preferences.
- Supports relay details such as Hue, ON/OFF, 230 V/neutral, ceiling/fixed wiring, 18 W load, compact, value and custom preferences.
- Budget mentioned in chat becomes the starting soft range in Configure; it is reviewed/edited there.
- Conversations explicitly identify the synthetic demo and fictional catalog data. No paid or cloud backend is called.
- Category routing still routes PC/computer, switch/interruttore, and ambiguous Nintendo/network switch questions. Later messages do not silently change category.

### Configure

- Editable review of the inferred requirements and the price range.
- Two-thumb price range remains the budget input, with relay-specific bounds.
- Requirements can be removed, added as custom text, or given high/normal priority emphasis.
- Copy and behavior make clear that priority changes ranking emphasis only. Nothing, including price, is an eligibility gate.

### Discover

- Progressively reveals a ranked **TopK** list: up to five PC results and all three relay fixtures.
- Ranks every product, including low-match and over-budget options. An empty state only appears when there is no product left in the catalog (for example after all feedback), not because a preference was missed.
- Prices are shown as ranges across the product's retailer/seller offers.
- Each card shows:
  - a preference-adherence percentage;
  - a consistent `Strong match` (85+), `Good match` (60–84.9) or `Poor match` (<60) label;
  - personalized reasons tied to the requested attributes;
  - explicit trade-offs, including over-budget distance and lower-spec differences;
  - unverified custom preferences, excluded from scoring and clearly labelled.
- Scores, labels, reasons and ranking are recomputed after feedback.

### Learn

- Learn is not a separate screen or navigation target. The breadcrumb shows the step, and the actual interaction is an accessible modal over Discover.
- `Not for me` opens the dialog. Apply is disabled until at least one reason or nonempty free text is entered. There is no silent discard/skip path.
- The modal derives an editable clarification from selected reasons and free text.
- Interpretable text becomes a soft ranking preference (for example quieter, compact, more RAM, stronger GPU, lower delivered price, higher relay capacity, Hue, or wiring).
- Uninterpretable text remains transparent and unverified; the user can edit the clarification before applying.
- Confirm removes the product, applies the learned preferences, closes the modal, and continues/reveals the recomputed ranking.
- Cancel leaves the result, preferences and ranking unchanged.
- Undo restores the product and removes only the preferences learned from that feedback entry. Later configuration edits are preserved. Favorites and expanded cards are preserved.

### Buy

- Opens from a selected Discover card and shows only that product's seller offers.
- PC offers show item, shipping, fees, delivered total, availability, delivery, warranty/returns and recorded fixture timestamp.
- Relay offers show the same supported costs and terms. No payment method is fabricated because the fixtures do not contain payment data.
- Back returns to Discover with expanded/favorite/feedback state intact.

## Verification

| Check | Final result |
|---|---|
| `npm test` | **PASS** — 8 test files, **52/52** unit tests |
| `npm run build` | **PASS** — TypeScript clean; Vite built 47 modules; JS 283.71 kB (86.71 kB gzip), CSS 10.99 kB (3.08 kB gzip) |
| `npm run test:e2e` | **PASS** — **16/16** Playwright tests, Chromium, 1 worker, 29.9 s |
| Existing preview server | Reused PID **16084** (`vite preview` on 4173). No duplicate server was started. |
| Network mutation check | **PASS** — desktop and mobile full-flow tests collected non-GET/HEAD requests and found none. |
| Mobile reachability | **PASS** — 320, 360 and 390 px; all five breadcrumb controls visible, no horizontal overflow, modal Apply/Cancel reachable. |
| Screenshots | **20** new full-flow screenshots captured under `artifacts/screenshots/new-flow-*`. |

### Playwright coverage

For **both PC and relay**, on **desktop 1440 px and mobile 390 px**:

- Ask with natural text extraction → Configure review.
- Progressive reveal timing (no result before two seconds, then one every two seconds).
- TopK counts (5 PC, 3 relay), descending scores, consistent percentage/label mapping, offer ranges.
- Personalized reason lists and Buy → Back state retention.
- Learn modal: disabled Apply with no input, free-text interpretation, editable clarification, cancel without change, reason-only apply, score/ranking recomputation, feedback log, undo restoration, removal of learned preference from Configure.

Additional tests cover:

- Soft budget: a CHF 1,000 PC ceiling still shows five over-budget products after 30 simulated seconds, each with an explicit soft-ceiling trade-off and no empty state.
- Free-text-only apply for both categories.
- 320/360/390 px navigation and modal controls.
- Ambiguous Nintendo/switch clarification and later category stability.
- Favorites across new search and reload.
- Feedback modal Escape/focus return and transparent uninterpretable free text.
- English copy and visible synthetic-data disclosure.

### Intermediate E2E failures and fixes

The first E2E run was **8 passed / 7 failed**. Failures were test-facing or small state issues, not flow blockers:

1. Relay Configure expected the old `Neon consumption: 18 W` label while the extractor emits `Load: 18 W`; assertion corrected.
2. Restored feedback disappeared because the log only rendered while at least one exclusion was active; the log now remains visible for restored entries.
3. Relay score-change assertion used a capacity reason that all fixtures already satisfy; changed to the compact preference, which produces a real ranking change.
4. Ambiguous-flow test tried to type into Ask while on Configure; test now navigates back to Ask first.

A later run added keyboard/focus and uninterpretable-text coverage and found **15 passed / 1 failed**: the modal hint incorrectly claimed an uninterpreted note had been mapped. The hint now checks the edited clarification itself, labels uninterpretable text transparently, and allows the user to edit or cancel. The final rerun passed all **16/16** tests. No outstanding test failures.

## Changed files

Updated:

- `src/App.tsx`
- `src/components/CharacteristicsPanel.tsx`
- `src/components/DismissModal.tsx`
- `src/components/FeedbackLog.tsx`
- `src/components/ProductCard.tsx`
- `src/components/RelayFlow.tsx`
- `src/components/ShoppingShell.tsx`
- `src/components/StageProgress.tsx`
- `src/lib/feedback.ts`
- `src/lib/flow.ts`
- `src/lib/flow.test.ts`
- `src/styles.css`
- `e2e/minimal.spec.ts`
- `README.md`

Added:

- `src/lib/requirements.ts`
- `src/lib/requirements.test.ts`
- `artifacts/new-flow-report.md`
- `artifacts/screenshots/new-flow-*` (20 screenshots)
- regenerated `dist/` assets and `artifacts/playwright-report/`

Preserved:

- PC and relay fixture data, store offers, category routing, and the legacy `matching.ts` / `mockReplies.ts` modules with their existing unit coverage. (Save/favorite controls were removed from the UI in the follow-up batch; legacy reports above predate that change.) The active UI now uses `flow.ts` + `requirements.ts`.

## Screenshots

PC and relay each have desktop and mobile captures for:

- `configure`
- `discover`
- `learn-cancel`
- `learn-applied`
- `buy`

Files are named:

```text
artifacts/screenshots/new-flow-{pc|relay}-{desktop|mobile}-{configure|discover|learn-cancel|learn-applied|buy}.png
```

## Remaining limitations

- This is still a deterministic synthetic demo, not a live AI, retailer, availability or checkout integration. Free-text interpretation is keyword-based and limited to demo-supported attributes.
- TopK is capped at five. The relay fixture catalog only contains three products, so it cannot demonstrate five relay results without inventing more fixtures.
- Unsupported/free-text requirements are stored and displayed transparently but intentionally do not affect scores.
- Relay fixtures are all compatible with the invented 18 W scenario. PC fixtures are used to demonstrate over-budget soft trade-offs.
- Payment methods are not shown because no fixture contains payment data; adding them would fabricate unsupported information.
- The legacy `matching.ts` module still contains older internal tier concepts for historical unit coverage, but it is not used by the active UI.
- Other state remains navigation-scoped; nothing persists across reloads (favorites were removed from the UI in the follow-up batch).

## Follow-up batch (all items together, verified 2026-10-29/30)

Wiki treated as authoritative source of truth. Checked via network fetch (successful):

- `Guided-Shopping-UX.md` — Journey at a glance; sections 1–5 (Ask, Configure, Discover, Learn, Buy); acceptance criteria. Key applied rules: Configure requirements stay editable soft preferences with no mandatory/optional constraint mode; Discover streams TopK progressively with running/partial/complete status, per-card delivered-total retailer price ranges with shipping/price basis, percentage match with optional Strong/Good/Poor label, personalized "I thought you would like this because…" explanation plus trade-offs, retailer badges only for retrieved offers, no merged configurations; Learn is a modal over Discover requiring a reason, recalculating matches/explanations and continuing discovery; Buy compares offers for the exact selected configuration.
- `Selection-Logic.md` — soft preferences (no hard-constraint stage, no silent required→exclusion conversion); progressive TopK with exact-variant grouping and observed ranges; 0–100% fit score with consistent percentage/label/explanation, recomputed after feedback including already-visible cards; Learn updates brief and refines search; Discover ranks products with retailer ranges, Buy compares individual offers with unknown costs kept unknown.
- `Home.md` — flow table and product rules (TopK with compromises, no invented products, products-first/sellers-second).

Re-verification of the earlier follow-ups against the wiki, and deviations fixed:

1. **Configure CTA**: present in PC (`App.tsx`) and relay (`RelayFlow.tsx`) Configure views as `data-testid="configure-continue"`, text "Find products →", bottom placement via `.configure-cta`, full-width on mobile. Navigates Configure → Discover; breadcrumb navigation untouched. E2E `Configure CTA is visible and navigates to Discover at 320, 360 and 390 px for both categories` passes.
2. **Discover loading indicator**: shared `src/components/LoadingIndicator.tsx`, CSS-only spinner (`.loading-spinner` + `loading-spin` keyframes, `prefers-reduced-motion` disables animation), `role="status"` + `aria-live="polite"`, `data-testid="discover-loading"`, `data-mode="loading"|"updating"`. Rendered while `pending` in both flows; "Loading products…" on first reveal, "Updating results…" after Learn apply/undo; disappears when complete. Single live region per page (search-status is plain text now). E2E `Discover loading indicator announces loading and updating, then disappears` asserts visible → animation-name `loading-spin` → gone, plus updating mode after dismissal, for both categories.
3. **No Save in Discover**: removed `favorite-*` buttons, `favorites-count` header badge, `FAVORITES_KEY`/`loadFavorites` helpers, `favorites` state and `ShoppingShell favorites` prop from `App.tsx`, `RelayFlow.tsx`, `ProductCard.tsx`, `ShoppingShell.tsx`; README no longer claims favorites. E2E `Discover has no Save controls, and New search resets the active flow` asserts zero `favorite-*` controls, no favorites badge/copy/localStorage keys, and that New search resets to Ask with Configure disabled.
4. **Prominent match**: every PC and relay card shows a badge-like `.match-score` pill next to the product name with `data-testid="match-<id>"`, `data-label`, text `<Label> · <score>%`; wrapping/placement rules keep it readable at 320/360/390px. Unit test labels every percentage consistently; e2e asserts badge visible, label matches score thresholds, contains label + `%` on every card, plus a dedicated 320/360/390 test.
5. **Price ranges + retailer tags**: every card shows `formatCHFRange(min, max)` delivered-total range (e.g. `CHF 1'450–1'640`) and `.retailer-tag` badges listing exactly the retailers with confirmed offers for that product (`priceRangeRetailers`), never invented. `Retailer` type extended with `Lantern Lane`/`Bright Parcel` so relay scoring carries real seller names instead of a hardcoded `TechStore` (all relay fixtures already had ≥2 offers, so no fixture invention was needed). Catalog hints state the delivered-total basis. Unit: `flow.test.ts` asserts range + exact retailer list; `sellers.test.ts` asserts `formatCHFRange` and retailer filtering excluding unconfirmed offers. E2E: every card's price matches `/^CHF [\d'.,]+[–-][\d'.,]+$/` with ≥1 visible in-viewport tag.
6. **Personalized reason**: every card shows an always-visible `data-testid="personalized-<id>"` line "I thought you would like this because …" built from the card's first current reason/trade-off/unknown, i.e. recomputed on every ranking (including after Learn). Full reason/trade-off lists remain in the expandable details. E2E asserts each visible card's line matches `/I thought you would like this because/i`, including post-feedback.
7. **Dismissed stay visible (deliberate wiki deviation)**: on Learn apply the dismissed product is NOT removed. It moves to the bottom of the Discover list as `.product-card--dismissed` (dimmed, name `line-through`, `data-dismissed="true"`), keeps its recomputed score, price range, retailer tags and reason line, plus `data-testid="dismissed-note-<id>"` ("Dismissed: <reasons> — <note>") and a per-card `data-testid="restore-<id>"` Restore button. Per-card Restore calls the same undo path as the feedback log (score/rank restored, learned preferences removed, later Configure edits intact); `FeedbackLog` Undo entries still work. E2E Learn test asserts bottom placement, struck-through computed style, note, Restore → `data-dismissed="false"` + log "Restored". **Deviation recorded**: wiki says "Keep dismissed products out of the current shortlist"; the user explicitly overrode this — dismissed products stay visible at the bottom instead.
8. **Matches-updated signal**: after apply/undo a `data-testid="matches-updated"` banner (`role="status"`, `aria-live="polite"`) states e.g. "Matches updated: <clarification> — scores recomputed for the visible list.", and recomputed cards get `.product-card--updated` (brief `match-flash` highlight, reduced-motion safe). Obvious on mobile (full-width banner above grid). E2E asserts banner role/text after dismissal in both categories.
9. **Buy per-offer links**: PC `SellerOffers` rows and relay Buy rows each render a synthetic demo link `https://example.com/<seller>/<product-id>` (`demoOfferUrl` in `lib/sellers.ts`) with `data-testid="seller-link-<offerId>"` / `"relay-offer-link-<index>"`, text "View at <Seller> (synthetic demo link) →", `target="_blank" rel="noopener noreferrer"` — only for sellers with a real fixture offer (links are generated per existing offer row, never for uncovered sellers). Back-to-Discover preserves expanded/match state. E2E asserts first offer link visible with `^https://example.com/` href in both categories; Buy still shows seller options and "Checkout is not available".

Changed files:

- `src/App.tsx` — favorites removal; `refreshing`/`updateNotice`/`highlighted` state; ranking includes dismissed products (`activeRanked`/`dismissedRanked`); dismissed bottom rendering with note/Restore; matches-updated banner.
- `src/components/RelayFlow.tsx` — same Discover changes for relay; retailer type fix (real seller names); relay Buy offer links.
- `src/components/ProductCard.tsx` — no favorites; price range + retailer tags; prominent match badge; always-visible personalized line; dismissed + highlighted rendering with Restore.
- `src/components/SellerOffers.tsx` — per-offer synthetic demo links.
- `src/components/ShoppingShell.tsx` — removed favorites badge/prop.
- `src/components/LoadingIndicator.tsx` — (unchanged, shared accessible spinner).
- `src/lib/flow.ts` — `RankedProduct.retailers`; `src/lib/sellers.ts` — `formatCHFRange`, `priceRangeRetailers`, `demoOfferUrl`.
- `src/lib/flow.test.ts`, `src/lib/sellers.test.ts` — range/retailer assertions.
- `src/styles.css` — CTA, spinner, match pill, retailer tags, personalized reason, dismissed, update banner, highlight flash, offer links, mobile rules.
- `e2e/minimal.spec.ts` — loading appears/disappears, no-Save, per-card match/price/tags/personalized at 320/360/390, dismissed-bottom + Restore, matches-updated banner, Buy links; Learn expectations updated for stay-visible behavior.
- `README.md` — documents CTA, loading, no-Save, match/price/tags/personalized, dismissed-at-bottom + Restore (with wiki-deviation note), Buy links.

Exact check outcomes (final verification, this session):

- `npm test`: **53 passed / 53** (8 files).
- `npm run build` (`tsc --noEmit` + `vite build`): **PASS**, 48 modules, `dist/assets/index-kvZ9ZKG8.css`, `dist/assets/index-CYa57NkI.js` (last two builds; CSS identical).
- `npm run test:e2e`: **19 passed / 19** (was 16/16 before the batch; +3 new tests: 320/360/390 card matrix, loading indicator, no-Save; Learn/buy tests extended in place). One transient failure of the desktop PC Learn test on the first full run (empty clarification read before React state settled) passed in isolation and was fixed by making the assertion retryable (`not.toHaveValue('')` before reading); final full rerun 19/19.
- Screenshots regenerated by the suite into `artifacts/screenshots/new-flow-{pc|relay}-{desktop|mobile}-{configure|discover|learn-cancel|learn-applied|buy}.png` (plus pre-existing captures; 65 files total in the directory).
- No git operations performed; UI remains English-only; no Italian copy detected (`synthetic-data disclosure` test passes).
