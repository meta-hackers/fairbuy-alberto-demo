# FairBuy gaming-PC demo — check report

Data verifica: 28 ottobre 2026 · directory: `/workspace/fairbuy-alberto-demo`
Stato: **verificata, non committata, non pubblicata**.

## Comandi eseguiti (ultima esecuzione)

| Comando | Esito | Dettaglio |
|---|---|---|
| `npm ci` | PASS | 99 pacchetti installati dal lockfile |
| `npm run build` | PASS | `tsc --noEmit` + Vite; 40 moduli; bundle 282.54 kB (85.84 kB gzip) |
| `npm test` | PASS | 2 file, **20/20** test unitari |
| `npx playwright test` | PASS | 1 file, **6/6** smoke E2E Chromium |

Nessun test fallito, skipped o flaky nell’ultima esecuzione. Playwright usa
`/usr/bin/chromium` (override: `PLAYWRIGHT_CHROMIUM_PATH`).

## Copertura smoke E2E

1. **Guided journey completa** — ASK → brief → ricerca progressiva → dismiss con
   chiarimento RAM → Undo → hard vs soft GPU/RAM → confronto → offerte esatte →
   dettaglio retailer simulato.
2. **Dismissal SKIP + Undo** — nessuna preferenza appresa dal solo rifiuto.
3. **Fonte offline/ripristino** — ranking parziale, banner, VORTEX neutro/conflitto,
   recovery senza stato residuo.
4. **Preferiti/reset** — persistenza `localStorage`, reload, reset demo.
5. **Empty state filtro preferiti** — messaggio esplicativo e rimozione filtro.
6. **Mobile 390 px** — nessun overflow orizzontale, card visibili, drawer navigazione.

## Copertura unit test

- Tier strong / preference / conflict / unknown.
- Hard fail GPU e RAM solo con modalità `required`.
- Range che attraversa il budget: nessuna esclusione automatica.
- Offerta entro budget con stock non confermato → unknown, non “miglior prezzo”.
- Offerta esatta mancante dalla fonte → unknown, non conflitto.
- Feedback: “keep” resta preferenza; `required` solo se scelto esplicitamente.
- Preferenza avoid-GPU aggiunta e reversibile.
- Rediscovery da pool alternative; SKIP non innesca nuove fixture.
- Gruppi venditori ordinati per totale consegnato; totali incompleti separati.
- Configurazioni esatte non fuse; formattazione CHF.

## Artefatti

- `artifacts/screenshots/desktop-ask.png`
- `artifacts/screenshots/desktop-discovery.png`
- `artifacts/screenshots/desktop-seller-offers.png`
- `artifacts/screenshots/desktop-source-offline.png`
- `artifacts/screenshots/mobile-discovery.png`
- `artifacts/playwright-report/` (report HTML, ignorato da Git)
- `artifacts/test-results/` (tracce/screenshot di failure, ignorato da Git)
- `test-results/` (output Playwright locale, ora ignorato da Git)

## Acceptance Wiki — sintesi

Coperti: budget min soft/max strict con slider e input; GPU/RAM hard vs preferred;
località coarse; card progressive e stato parziale; config/condizione esatte;
range con base dichiarata; badge retailer + “dati sintetici”; dismiss multi-motivo,
testo libero, SKIP, chiarimento e Undo; preferenze apprese visibili/rimovibili;
rediscovery; verde/ambra/rosso/neutro con etichette; hard fail separato; range vs
budget; offerte ordinate per totale confermato con breakdown, stock, consegna,
garanzia, resi e timestamp fittizio; totali mancanti separati; uscita simulata
“Nessun acquisto effettuato”; preferiti, confronto, reset, responsive e focus.

Dettaglio tabellare: `README.md` → “Copertura acceptance Wiki”.

## Gap dichiarati

- Nessuna AI/STT/TTS, nessun connettore, scraping, backend, auth o monitoraggio.
- Nessun input URL/screenshot e nessun fetch arbitrario.
- Nessun prezzo, stock o venditore reale; nessuna copertura di mercato.
- Match illustrativo, non probabilità né certificazione.
- Rediscovery deterministica e limitata al pool di fixture.
- Nessun checkout, ordine, contatto o link retailer attivo.
- Pubblicazione GitHub Pages e commit restano al parent.
