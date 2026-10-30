# FairBuy — minimal product shopping UI

Frontend-only, deterministic prototype with PC and smart-relay fixture categories. The interface is English and product-generic, with one top breadcrumb:

**Ask → Configure → Discover ↔ Learn → Buy**

`Learn` is not a separate screen: product feedback opens an accessible modal over Discover.

## Run and verify

```bash
npm ci
npm run dev
npm run build
npm test
npm run test:e2e
```

Playwright uses `/usr/bin/chromium` if available; alternatively set `PLAYWRIGHT_CHROMIUM_PATH`. It previews the built `dist/` on port 4173. Build before running E2E tests. Vite uses `base: './'` for relative static assets.

## Interaction

- Ask starts with an empty conversation. Enter sends; Shift+Enter adds a line. Messages stay unstructured; requirements are extracted from what the user actually writes, and Configure becomes available once enough useful detail is present.
- The first request chooses the category. `pc` and `computer` route to PCs; `switch` and `interruttore` route to smart relays. Ambiguous Nintendo/network switch requests receive a category clarification. Later messages do not silently change category.
- Budget can be mentioned naturally in Ask, but it is reviewed and edited only in Configure. The inferred budget becomes the starting soft price range; it is never used in Ask as a wizard step.
- Configure is the only requirements form. It contains a two-thumb budget range, removable requirements, custom text, and optional high/normal priority emphasis for GPU and RAM. Every requirement, including price, is a soft preference: high priority raises ranking weight but never excludes a product. Custom text remains explicitly unverified.
- Configure ends with a prominent primary action, “Find products →”, that is reachable at 320/360/390 px and opens Discover without breaking breadcrumb navigation.
- Entering Discover shows a progressively revealed ranked TopK list (up to five; the relay fixtures provide three), one result every two seconds. There is no start button or duplicate form. An accessible loading status announces “Loading products…” during progressive reveal and “Updating results…” after feedback, then disappears when the list is complete. Each card shows its delivered-total price range with currency, retailer tags for the offers behind that range, preference-adherence percentage, a prominent Strong/Good/Poor label, an always-visible personalized line (“I thought you would like this because …”) grounded in the current preferences, personalized reasons and explicit trade-offs, including over-budget comparisons. Returning resumes the list; changing configuration restarts it. Timers stop on navigation/unmount.
- Compact expandable product cards support feedback and opening purchase options. There are no Save/favorite controls. There is no product comparison feature or phase.
- Learn opens as a modal over Discover from a card's “Not for me” action. Applying feedback requires at least one reason or nonempty free text. Cancel leaves everything unchanged. The modal shows an editable clarification; interpretable text becomes a soft ranking preference, while uninterpretable text is labelled unverified rather than silently ignored. Apply keeps the dismissed product at the bottom of Discover (struck through and dimmed, with its updated score, price range, retailer tags and a dismissal note) and recomputes scores and ranking for the rest; a “Matches updated” banner announced via aria-live names the change, and recomputed cards flash briefly. Each dismissed card has a per-card Restore action; the feedback log keeps working Undo entries too. Undo restores the product and removes only preferences learned from that entry. Expanded cards are preserved. (Deliberate deviation from the wiki, which keeps dismissed products out of the shortlist: the user explicitly requested they stay visible.)
- Buy requires a product selected from Discover. It shows only that product and its complete seller options, item costs, shipping, fees, delivered totals, stock, delivery windows, and terms supported by the fixtures. Each offer row carries a seller tag and a synthetic demo product link (`https://example.com/<seller>/<product>`, only for sellers with a real fixture offer for that product). It has no filters. Back returns to Discover with its state intact. Default fixtures are complete; future incomplete inputs still retain explicit missing-data handling.
- New search clears the active conversation, selection, configuration, and feedback. All state persists only during navigation in the current browser page, not across reloads.

## Implementation boundaries

This remains a mock, not a live shopping or AI service. All PC products, prices, stock, timestamps, and terms are invented fixtures in `src/data/fixtures.ts`. Retailer names and component brands are illustrative, not integrations or live evidence. The interface is explicitly labelled as a synthetic demo with a fictional catalog, while avoiding repetitive badges on every row. Every default offer is populated with invented data; neither a displayed stock status nor a recorded timestamp represents a real observation. Buy is read-only: there is no checkout, order, reservation, seller message, or remote mutation. No completed purchase is claimed.

The relay dataset in `src/data/relay.ts` is now entirely fictional rather than a historical research catalog. The setup assumes an **invented 18 W neon load**, 230 V AC with neutral, a ceiling junction box, and Philips Hue Bridge control. LumaNest Relay One (120 W LED capacity), Glowstead Mini Relay (150 W), and Embervale Link Relay (100 W) are invented ON/OFF-only devices, with invented Hue compatibility and two complete offers each from invented sellers Lantern Lane and Bright Parcel. Hue support is a scenario attribute, not a certification or claim about a real relay. There are **no real relay model names, ASINs, source URLs, or seller links** in active data or UI. Capacities exceed the 18 W scenario load, and discovery uses calculated delivered totals rather than disconnected planning estimates. Electrical installation is left to a qualified professional; no wiring instructions are provided.

Filled PC fields include NOVA/PC Dock shipping CHF 49 and fees CHF 20 (total CHF 1,909, 4–6 days), AURA/PC Dock shipping CHF 35 and fees CHF 10 (total CHF 1,625, 3–4 days), and VORTEX/Galaxus availability (total CHF 2,350, 2–4 days). These offers are all marked Available within the fictional dataset. Full invented relay values and check results are in `artifacts/filled-data-report.md`.

Missing-data behavior is not disabled: nullable offer costs still produce unknown totals; incomplete future offers are not priced by treating absent charges as zero. Tests construct explicit incomplete inputs for missing costs/stock, and relay scenario checks reject insufficient capacity, wrong voltage, lack of Hue support, or dimming-only devices. Custom free text is not automatically converted into a verified product attribute.

AI interpretation remains future server-side work. The current UI uses deterministic keyword extraction, editable clarifications, and local preference scoring, with an explicit fallback for unsupported input. It does not call a model, scrape retailers, fetch arbitrary user URLs, or implement an API. No infrastructure, backend, or live availability was added.

## Files

- `src/App.tsx`: PC state, category routing, discovery, feedback, and selected Buy product.
- `src/components/ShoppingShell.tsx`, `StageProgress.tsx`: shared generic frame and accessible breadcrumb.
- `src/components/RelayFlow.tsx`: separate relay state and read-only purchase options.
- `src/components/ChatPanel.tsx`, `CharacteristicsPanel.tsx`, `PriceRangeSlider.tsx`: request and Configure controls.
- `src/components/ProductCard.tsx`, `SellerOffers.tsx`: compact results and read-only PC purchase options.
- `src/components/FeedbackLog.tsx`, `DismissModal.tsx`: exclusion and restoration.
- `src/lib/flow.ts`, `requirements.ts`, `feedback.ts`, `sellers.ts`: extraction, soft ranking, visible explanation, and feedback behavior.
- `src/lib/matching.ts`, `mockReplies.ts`: legacy helper modules retained for existing internal coverage; the active UI uses `flow.ts` and `requirements.ts`.
- `e2e/minimal.spec.ts`: PC + relay on desktop/mobile, natural Ask extraction, Configure CTA, progressive TopK with loading/updating status, per-card match/price-range/retailer tags, Learn modal validation/cancel/free text/apply/undo, score and ranking updates, soft budget trade-offs, Buy/back state, mobile 320/360/390 reachability and category routing.
- `src/data/filledFixtures.test.ts`, `src/lib/requirements.test.ts`: complete fixture, extraction and interpretation regressions.
- `artifacts/new-flow-report.md`: current flow implementation, exact checks, failures, screenshots, and limitations.
- `artifacts/minimal-report.md`, `artifacts/filled-data-report.md`: earlier work retained for history.

## Project references

The public Wiki at commit [`7c7498f99d5c04708dcd70d7a9ce8e2bc254e026`](https://github.com/meta-hackers/fairbuy/wiki/7c7498f99d5c04708dcd70d7a9ce8e2bc254e026) describes future ideas, not implemented services:

- [Guided Shopping UX](https://github.com/meta-hackers/fairbuy/wiki/Guided-Shopping-UX)
- [Gaming PC Demo](https://github.com/meta-hackers/fairbuy/wiki/Gaming-PC-Demo)
- [Selection Logic](https://github.com/meta-hackers/fairbuy/wiki/Selection-Logic)
- [Architecture](https://github.com/meta-hackers/fairbuy/wiki/Architecture)

No commits, pushes, deployments, or Wiki changes are part of this implementation.
