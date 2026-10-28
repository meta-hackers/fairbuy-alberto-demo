# FairBuy — minimal product shopping UI

Frontend-only, deterministic prototype with PC and smart-relay fixture categories. The interface is English and product-generic, with one top breadcrumb:

**Ask → Configure → Discover → Learn → Buy**

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

- Ask starts with an empty conversation. Enter sends; Shift+Enter adds a line.
- The first request chooses the category. `pc` and `computer` route to PCs; `switch` and `interruttore` route to smart relays. Ambiguous Nintendo/network switch requests receive a category clarification. Later messages do not silently change category.
- After two user messages, predefined requirements become available. Messages do not parse or automatically update these requirements. Review and edit them in Configure.
- Configure is the only requirements form. It contains a two-thumb budget range, removable requirements, custom text, and explicit required/preferred GPU and RAM controls. Required targets exclude below-target PCs; preferred targets allow trade-offs. Custom text remains unverified. The predefined relay requirements are supported within the invented 18 W scenario, not certified against real products.
- Entering Discover starts timed discovery automatically: one result every two seconds. There is no extra start button, repeated form, or constraint list. Returning resumes the current list; changing configuration restarts it. Timers stop on navigation/unmount.
- Compact expandable product cards support favorites, exclusion feedback, and opening purchase options. There is no product comparison feature or phase.
- Learn records reasons and notes with a restore action. Only explicit RAM/GPU priority choices alter requirements; undo preserves later edits.
- Buy requires a product selected from Discover. It shows only that product and its complete seller options, item costs, shipping, fees, delivered totals, stock, delivery windows, and terms. It has no filters. Back returns to Discover. Default fixtures are complete; future incomplete inputs still retain explicit missing-data handling.
- New search clears the active conversation, selection, configuration, and feedback; favorites are retained. PC and relay favorites are stored locally under `fairbuy-demo-favorites-v1` and `fairbuy-relay-favorites-v1` respectively. Other state persists only during navigation in the current browser page, not across reloads.

## Implementation boundaries

This remains a mock, not a live shopping or AI service. All PC products, prices, stock, timestamps, and terms are invented fixtures in `src/data/fixtures.ts`. Retailer names and component brands are illustrative, not integrations or live evidence. The UI deliberately omits repetitive demo/synthetic labels. Every default offer is populated with invented data; neither a displayed stock status nor a recorded timestamp represents a real observation. Buy is read-only: there is no checkout, order, reservation, seller message, or remote mutation. No completed purchase is claimed.

The relay dataset in `src/data/relay.ts` is now entirely fictional rather than a historical research catalog. The setup assumes an **invented 18 W neon load**, 230 V AC with neutral, a ceiling junction box, and Philips Hue Bridge control. LumaNest Relay One (120 W LED capacity), Glowstead Mini Relay (150 W), and Embervale Link Relay (100 W) are invented ON/OFF-only devices, with invented Hue compatibility and two complete offers each from invented sellers Lantern Lane and Bright Parcel. Hue support is a scenario attribute, not a certification or claim about a real relay. There are **no real relay model names, ASINs, source URLs, or seller links** in active data or UI. Capacities exceed the 18 W scenario load, and discovery uses calculated delivered totals rather than disconnected planning estimates. Electrical installation is left to a qualified professional; no wiring instructions are provided.

Filled PC fields include NOVA/PC Dock shipping CHF 49 and fees CHF 20 (total CHF 1,909, 4–6 days), AURA/PC Dock shipping CHF 35 and fees CHF 10 (total CHF 1,625, 3–4 days), and VORTEX/Galaxus availability (total CHF 2,350, 2–4 days). These offers are all marked Available within the fictional dataset. Full invented relay values and check results are in `artifacts/filled-data-report.md`.

Missing-data behavior is not disabled: nullable offer costs still produce unknown totals; incomplete future offers are not priced by treating absent charges as zero. Tests construct explicit incomplete inputs for missing costs/stock, and relay scenario checks reject insufficient capacity, wrong voltage, lack of Hue support, or dimming-only devices. Custom free text is not automatically converted into a verified product attribute.

AI interpretation remains future server-side work. The current UI uses predefined follow-ups, deterministic keyword replies, and local matching, with an explicit fallback for unsupported input. It does not call a model, scrape retailers, fetch arbitrary user URLs, or implement an API. No infrastructure, backend, or live availability was added.

## Files

- `src/App.tsx`: PC state, category routing, discovery, feedback, and selected Buy product.
- `src/components/ShoppingShell.tsx`, `StageProgress.tsx`: shared generic frame and accessible breadcrumb.
- `src/components/RelayFlow.tsx`: separate relay state and read-only purchase options.
- `src/components/ChatPanel.tsx`, `CharacteristicsPanel.tsx`, `PriceRangeSlider.tsx`: request and Configure controls.
- `src/components/ProductCard.tsx`, `SellerOffers.tsx`: compact results and read-only PC purchase options.
- `src/components/FeedbackLog.tsx`, `DismissModal.tsx`: exclusion and restoration.
- `src/lib/flow.ts`, `matching.ts`, `feedback.ts`, `mockReplies.ts`, `sellers.ts`: local matching and behavior.
- `e2e/minimal.spec.ts`: PC + relay on desktop/mobile, automatic discovery, one navigation, no duplicate filters, Buy, feedback, keyboard, no comparison/disclaimer labels, screenshots.
- `src/data/filledFixtures.test.ts`: complete fixture and future missing-data/incompatibility regression tests.
- `artifacts/minimal-report.md`: earlier minimal-UX work and review follow-up.
- `artifacts/filled-data-report.md`: current invented values, checks, screenshots, and completion timestamp.

## Project references

The public Wiki at commit [`7c7498f99d5c04708dcd70d7a9ce8e2bc254e026`](https://github.com/meta-hackers/fairbuy/wiki/7c7498f99d5c04708dcd70d7a9ce8e2bc254e026) describes future ideas, not implemented services:

- [Guided Shopping UX](https://github.com/meta-hackers/fairbuy/wiki/Guided-Shopping-UX)
- [Gaming PC Demo](https://github.com/meta-hackers/fairbuy/wiki/Gaming-PC-Demo)
- [Selection Logic](https://github.com/meta-hackers/fairbuy/wiki/Selection-Logic)
- [Architecture](https://github.com/meta-hackers/fairbuy/wiki/Architecture)

No commits, pushes, deployments, or Wiki changes are part of this implementation.
