# FairBuy — gaming PC demo (frontend only)

Static, interactive demo of the **FairBuy Guided Shopping** journey for a new gaming PC. This is not a live product: products, configurations, prices, retailers, stock, and timestamps are fictional synthetic fixtures. There is no AI, backend, authentication, scraping, checkout, real retailer link, or seller contact.

The interface starts with a genuinely empty chat and guides the user through:

**ASK → CONFIGURE → DISCOVER → LEARN → CHOOSE → COMPARE**

PC is the fallback category. A first message mentioning a smart switch routes to a separate neon relay demo. Only the first message (or a reply to a category clarification) selects the category; later messages do not change it. The `pc`, `computer`, `switch`, and `interruttore` routing aliases are retained.

## What you can try

- Empty ASK: no prefilled messages or characteristics.
- First free-text message → one scripted reply asking about use, budget, and preferences.
- Second message → exact reply `ok, I have enough information` and mock characteristics (use, resolution, GPU, RAM, condition).
- Chat remains available after characteristics appear; later deterministic replies are labeled “scripted · no AI” and do not reset characteristics.
- Characteristics can be removed individually or added as free text; edits persist across ASK, CONFIGURE, and DISCOVER.
- All six stages remain visible. Unavailable stages are disabled with an explanation; on narrow screens, they use two rows.
- Compact cards show a name and lowest confirmed price; accessible expansion shows details, favorites, comparison, offers, and exclusion with a reason.
- Reversible exclusions with reasons/notes, a LEARN log, and restore. Only explicit RAM/GPU choices change the displayed characteristic; no hidden rules.
- Separate smart relay flow with mock characteristics, unknown neon wattage, and historical unverified candidates. It supports product comparison and gives no wiring instructions.
- Configure CTA appears only after characteristics are revealed; there is no automatic navigation.
- CONFIGURE has one two-thumb price slider, visible CHF values, keyboard support, and prevents the thumbs crossing.
- DISCOVER keeps filters visible, reveals one mock product every **2000 ms**, and has searching, completion, and useful empty states.
- Price and supported characteristics filter results. Custom characteristics are shown but **unverified** and are not used to claim a match.
- Timers are cleaned up on navigation, filter changes, and unmount; results are not duplicated.
- Exact offers by configuration/condition, product comparison, favorites in `localStorage`, simulated Galaxus outage, and retailer details stating “No purchase has been made.”
- Mobile layout without horizontal overflow across ASK > CONFIGURE > DISCOVER > LEARN > CHOOSE > COMPARE.

### ASK free-text input

In ASK, type a free-text reply: **Enter** sends; **Shift+Enter** adds a line. Replies are deterministic and scripted around keywords (budget, games, resolution/FPS, RAM, GPU), with an explicit fallback for other input. There is no AI model or network request. Free text does **not** change characteristics; manage preferences with CONFIGURE controls or the characteristics panel.

## Demo boundaries

- All data is static in `src/data/fixtures.ts`.
- Amazon, Galaxus, MediaWorld, TechStore, and PC Dock are illustrative labels; there are no integrations, APIs, or real availability.
- There is no URL/screenshot input and no arbitrary fetch.
- ASK free text is checked against fixed keywords, not a language model. Unrecognized input receives a fallback that does not pretend to understand it.
- Free text does not change characteristics; they remain as revealed or explicitly changed by the user.
- The price filter uses the fixture’s **lowest confirmed delivered total**; it is not a market price or quote.
- Custom characteristics cannot be checked against synthetic specifications; they are ignored for matching and explicitly flagged.
- The “match” score is illustrative and separate from evidence confidence.
- Online/offline sources are simulated locally; no network is queried.
- No payment, order, reservation, or seller message is possible.
- Relay claims are historical and unverified. Actual neon load is unknown; cited module capacity is not a load measurement, and no-dimmer capability remains to verify.

## Getting started

```bash
npm ci
npm run dev          # development
npm run build        # type-check + build in dist/
npm run preview      # preview the build
npm test             # deterministic unit tests
npm run test:e2e     # Playwright tests (Chromium)
```

If Playwright does not use a bundled browser, set its Chromium path:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

The project uses Vite with `base: './'`; the contents of `dist/` can be published on GitHub Pages at the root or under `/fairbuy-alberto-demo/`. After each change, `npm run build` regenerates `dist/` with relative assets ready for publication.

## Three-minute walkthrough

1. **0:00–0:35 — ASK.** Open the demo; the chat is empty. Type “I need a PC for competitive and AAA gaming” and send. The scripted reply asks about use, budget, and preferences. Send a second message, such as “Budget CHF 2,000, 1440p; GPU and RAM matter.” The assistant replies exactly `ok, I have enough information` and reveals characteristics.
2. **0:35–1:05 — CONFIGURE.** Select “Configure price and filters.” Try both thumbs, keyboard input, and the minimum/maximum constraint. Remove a characteristic and add “Wi-Fi 7”; it remains saved. Return to ASK and verify the conversation and edits persist.
3. **1:05–1:45 — DISCOVER.** Start discovery. No cards appear initially; one appears every two seconds below the filters. Discovery stops when compatible results are exhausted; changing a filter restarts the count without duplicates. An impossible price range displays the empty state.
4. **1:45–2:20 — EXACT OFFERS.** Open NOVA and review offers sorted by delivered total, including the unconfirmed-total group. Open simulated retailer details: “No purchase has been made.”
5. **2:20–2:45 — COMPARISON / FAVORITES.** Return to products, compare two cards, and save a favorite. Optionally simulate the Galaxus source going offline.

## Frontend-only architecture

```text
src/
  data/fixtures.ts             shared types, products, offers, default brief
  data/relay.ts                historical relay candidates and caveats
  lib/flow.ts                  mock characteristics, price/feature filters, discovery matching
  lib/matching.ts              feasibility, tier, score, offers, legacy compatibility
  lib/mockReplies.ts           scripted keyword replies and fallback
  lib/sellers.ts               totals, offer groups, ranges, sorting, CHF formatting
  components/ChatPanel.tsx     empty chat, composer, Enter/Shift+Enter, Configure CTA
  components/CharacteristicsPanel.tsx  removable list and free-text input
  components/PriceRangeSlider.tsx      accessible two-thumb slider
  components/StageProgress.tsx         stage navigation and locks
  components/ProductCard.tsx           compact/expanded product card
  components/SellerOffers.tsx          exact offers and simulated retailer details
  components/RelayFlow.tsx             separate relay demo
  App.tsx                              local state, timers, filters, comparison, favorites
  styles.css                           visual system and responsive layout
e2e/ask-free-text.spec.ts               chat, relay routing, persistence, mobile
e2e/smoke.spec.ts                       stages, slider, timing, filters, offers
```

State and persistence are local to the browser. The only persisted data is favorites in `localStorage` (key `fairbuy-demo-favorites-v1`), cleared when the demo resets.

## Wiki references

Public Wiki at commit [`7c7498f99d5c04708dcd70d7a9ce8e2bc254e026`](https://github.com/meta-hackers/fairbuy/wiki/7c7498f99d5c04708dcd70d7a9ce8e2bc254e026):

- [Guided Shopping UX](https://github.com/meta-hackers/fairbuy/wiki/Guided-Shopping-UX)
- [Gaming PC Demo: slides and walkthrough](https://github.com/meta-hackers/fairbuy/wiki/Gaming-PC-Demo)
- [Product Selection Logic](https://github.com/meta-hackers/fairbuy/wiki/Selection-Logic)
- [Pain Points and Opportunities](https://github.com/meta-hackers/fairbuy/wiki/Pain-Points-and-Opportunities)
- [Architecture](https://github.com/meta-hackers/fairbuy/wiki/Architecture)
- [Audio](https://github.com/meta-hackers/fairbuy/wiki/Audio)

Architecture, connectors, search services, and audio described in the Wiki are future ideas, not implemented in this demo. The UI follows the navy/teal visual direction, compact logo, stage progress, conversational panel, top filters, and card grid.

## Acceptance coverage

| Criterion | Status | Notes |
|---|---|---|
| Empty ASK, no prefilled messages | Covered | `messages` starts as `[]`; the hint is not a message |
| First message → one scripted reply | Covered | Asks about use, budget, and preferences |
| Second message → `ok, I have enough information` | Covered | Exact message text |
| Mock characteristics after two messages | Covered | Five supported characteristics |
| Chat remains writable after reveal | Covered | Keyword replies do not reset characteristics |
| Characteristics removable/addable | Covered | Free text marked unverified |
| Persistence across ASK/CONFIGURE/DISCOVER | Covered | Shared state in `App.tsx` |
| Configure CTA only after reveal | Covered | No automatic navigation |
| Separate CONFIGURE stage | Covered | Chat is hidden |
| Two-thumb slider, visible values, no crossing | Covered | Overlaid range inputs with min/max clamp |
| Keyboard accessibility | Covered | Arrow keys, Home/End, visible focus |
| DISCOVER filters remain visible | Covered | Filters above results |
| One result every 2000 ms | Covered | Timer cleaned up and restarted |
| Price and supported-feature filters | Covered | Deterministic fixture matching |
| Custom characteristics not claimed compatible | Covered | Explicit note; ignored for matching |
| Searching and completion states | Covered | Status and final message |
| Useful empty state | Covered | Includes a widen-budget action |
| Timer cleanup and no duplicate results | Covered | Fake-clock test |
| Consistent return to ASK/DISCOVER | Covered | Conversation, characteristics, and filters persist |
| Exact offers and comparison | Covered | Legacy functionality retained |
| Mobile and basic accessibility | Covered | No overflow at 390 px; labels and focus |
| AI/STT/TTS, connectors, scraping | Not implemented | Outside frontend-only demo scope |
| Real prices, stock, or market coverage | Not available | Synthetic CHF fixtures only |

## Tests and verification

```bash
npm run build
npm test
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

See `artifacts/english-report.md` for the translation summary. Screenshots and other reports are in `artifacts/`; screenshots are ignored by Git.

## Limitations

- Fixtures do not establish real prices, stock, warranties, or reliability.
- “Match” is not a probability or certification; the rules are illustrative.
- Discovery is deterministic and limited to the local pool; there is no live retrieval.
- ASK free text is not NLU and does not extract requirements; replies do not update characteristics.
- Custom characteristics are not verified against products.
- Retailer actions do not open real URLs or make purchases.
- A live integration would require authorized source access, evidence, timestamps, error handling, and a backend, all outside this demo.
- No commits, pushes, or publication were made by the agent.
