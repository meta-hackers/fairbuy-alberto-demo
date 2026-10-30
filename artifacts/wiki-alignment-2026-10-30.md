# Canonical wiki alignment — 2026-10-30

## Scope and source of truth

Reviewed the canonical text supplied in the request, identified as live wiki commit `c425bd9`:

- **Guided Shopping UX**: Journey at a glance; Ask, Configure, Discover, Learn, Buy; Example; Acceptance criteria.
- **Product Selection Logic**: Preferences drive retrieval and ranking; Progressive TopK; Match percentage and labels; Personalized explanations; Learn updates the request; Product choice versus offer choice.

Preserved the English UI and the existing PC/relay demo. No feature or live retailer integration is claimed beyond the synthetic fixtures. Baseline snapshots are stored under `artifacts/wiki-alignment-2026-10-30-baseline/`. Snapshots for `App.tsx` and `ChatPanel.tsx` were captured from the active worktree before this alignment; all other snapshots are byte-identical to the pre-alignment project tree. `sha256sum` can be run over that directory to verify the saved baseline. New files `src/lib/askProgress.ts` and `.test.ts` have no prior baseline.

## Changes mapped to the wiki

### Ask: free-form conversation and Continue gate

- Added an always-visible **Continue to Configure →** CTA in `ChatPanel`; it is disabled until two distinct, nonblank follow-up answers have been submitted. The first shopping request is explicitly excluded from the count.
- `distinctFollowUpCount` normalizes case and whitespace, excludes blank turns and a resubmitted initial request, and deduplicates repeated follow-up answers. Duplicate answer submissions and whitespace do not inflate progress.
- Continue and the Configure breadcrumb share the same gate; navigation by keyboard or click preserves the accumulated extracted brief. The two follow-ups are open-ended prompts, not a fixed or exhaustive questionnaire.
- PC flow counts its chat turns; RelayFlow counts its seeded category-clarification turn (when present) and subsequent turns. Both paths use the same count helper.

### Configure: editable soft preferences, currency and provenance

- Existing editable requirements and CHF range remain in Configure. No hard filter or mandatory/optional constraint mode was added; “High priority” remains a ranking weight only.
- Preferences now carry origin metadata (`chat`, `user-edit`, or `feedback`), shown beside each characteristic. Budget range origin is shown as chat, Configure edit or demo default.
- Continue arrives with the extracted requirements and budget intact for PC and relay.

### Discover: progressive TopK, identity, price, match and explanations

- Kept the existing progressive Reveal, loading status, TopK cap and PC/relay synthetic fixture datasets. Ranking remains preference-based; price/spec mismatches are trade-offs, not eligibility exclusions.
- Dismissed products are now removed from the active request shortlist, as required by the current wiki; remaining candidates are reranked and the next fixture candidate is revealed if available. Relay remains at the number of real remaining fixtures; nothing is invented to fill K.
- Each visible card now displays its model, configuration/relevant attributes and condition; a delivered-price range with currency and stated basis; retailer tags from actual fixture offers; a consistent match percentage/label; a preference-grounded “I thought you would like this because…” reason; and the leading important trade-off when one exists. Expanded details retain full reasons, trade-offs and unknowns.
- “Matches updated” remains an accessible live announcement after Learn apply/undo; visible matches receive the existing brief highlight.

### Learn: modal, required reason, recalculation and undo

- Learn remains a modal over Discover. Apply is disabled until the user selects a concrete contextual reason or enters nonempty free-text feedback. Selecting “Another reason” alone now requires an explanation. Cancel does not alter the shortlist or preferences.
- The clarification stays visible/editable; recognized feedback becomes a soft preference, and unrecognized text remains explicitly unverified. Applying feedback removes the dismissed product only from this request’s shortlist, recalculates scores/labels/explanations, and continues/refines the fixture-backed shortlist. Feedback-log Undo restores the product and removes only learned preferences, preserving later Configure edits.
- Corrected the old modal and feedback-log wording that incorrectly described products as kept at the bottom. The earlier user-requested “keep dismissed visible” behavior deliberately differs from this latest canonical wiki and is superseded here.

### Buy: exact selected product and retrieved offers

- Buy continues to use only the selected exact product’s offers (PC `offersForProduct`; relay `active.offers`), not cheaper unrelated configurations. Seller rows retain item price, shipping/fees, delivered total, stock, delivery and terms, with unknown costs handled as unknown and Back preserving Discover state.
- Existing `example.com` offer URLs are clearly labelled **synthetic demo links**, not real retailer product URLs or confirmed integrations. The fictional fixtures contain no real product-page URLs; no real retailer coverage or source link was fabricated.

## Files changed

- `src/App.tsx`, `src/components/RelayFlow.tsx`, `src/components/ChatPanel.tsx`, `src/components/StageProgress.tsx` — distinct follow-up progress, Continue/breadcrumb gate and brief preservation; current shortlist excludes dismissals.
- `src/lib/askProgress.ts`, `src/lib/askProgress.test.ts` — follow-up normalization/counting and unit coverage.
- `src/lib/flow.ts`, `src/lib/flow.test.ts`, `src/lib/requirements.ts`, `src/lib/requirements.test.ts` — characteristic provenance and coverage.
- `src/components/CharacteristicsPanel.tsx`, `src/components/PriceRangeSlider.tsx`, `src/components/ProductCard.tsx`, `src/components/DismissModal.tsx`, `src/components/FeedbackLog.tsx`, `src/styles.css` — visible provenance, card attributes/trade-offs, required-reason copy and canonical dismissal behavior.
- `e2e/minimal.spec.ts` — ASK state matrix, category paths, updated Learn expectations and fixture retrieval assertions.
- `README.md` — current Ask gate and canonical Learn behavior.
- `artifacts/wiki-alignment-2026-10-30-baseline/` — saved pre-alignment source/test/doc snapshots.

## Verification outcomes

- `npm test`: **PASS — 57 tests in 9 files**.
- `npm run build`: **PASS — TypeScript check and Vite production build, 49 modules**.
- `npm run test:e2e`: **PASS — 20/20 Playwright tests**. Desktop (1440px) and mobile (390px) PC/relay complete flows; explicit Ask matrix at 1440, 320, 360 and 390px; visible/disabled/enabled CTA, keyboard submit and keyboard CTA, blank/repeated/initial-answer deduplication, extracted Configure values, progressive Discover, Learn required reason/cancel/re-ranking/retrieval/Undo, Buy exact-offer rows and Back; existing responsive Discover/Configure checks at 320/360/390px.
- An earlier e2e run during alignment had failures from obsolete “dismissed card remains visible” assertions and a duplicate Learn preference in the fixture conversation. Those expectations/data were corrected. The final full run passed all 20 tests.
- No commits, pushes, deploys, wiki changes or Git initialization were performed in the source-only project directory as part of the alignment itself.
