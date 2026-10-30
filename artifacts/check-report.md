# FairBuy gaming-PC demo — check report

Data verifica: 28 ottobre 2026 · directory: `/workspace/fairbuy-alberto-demo`  
Stato: **verificata, non committata, non pubblicata**.

Il flusso principale è **ASK vuota → due messaggi → caratteristiche mock → CONFIGURE → DISCOVER**.
Il dettaglio completo della modifica è in `artifacts/flow-update-report.md`.

## Comandi eseguiti (ultima esecuzione)

| Comando | Esito | Dettaglio |
|---|---|---|
| `npm run build` | PASS | `tsc --noEmit` + Vite; 42 moduli; JS 275.77 kB (84.31 kB gzip); CSS 27.08 kB (6.08 kB gzip); `dist/` per Pages |
| `npm test` | PASS | 4 file, **35/35** test unitari |
| `npm run test:e2e` | PASS | 2 file, **13/13** test E2E Chromium |

Nessun test fallito, skipped o flaky nell’ultima esecuzione. Playwright usa
`/usr/bin/chromium` (override: `PLAYWRIGHT_CHROMIUM_PATH`).

## Copertura E2E

1. ASK vuota, zero messaggi e nessuna feature preimpostata.
2. Primo messaggio → una sola risposta mock su uso/budget/preferenze.
3. Secondo messaggio → testo esatto `ok, ho abbastanza informazioni` + 5 caratteristiche.
4. Chat ancora scrivibile; le caratteristiche non si azzerano.
5. Invio/Shift+Invio, blocco del vuoto, rendering sicuro come testo.
6. Aggiunta/rimozione custom e persistenza tra ASK, CONFIGURE e DISCOVER.
7. Guardie di navigazione: Configure/Discover bloccati prima dei due messaggi.
8. Slider a due cursori: valori visibili, frecce/Home/End, nessun incrocio.
9. Discover: nessuna card prima di 2 s, una a 2 s, due a 4 s; filtri conservati.
10. Cleanup timer e riavvio su cambio filtro; filtro prezzo 1’800–2’000.
11. Stato vuoto immediato e reset del filtro.
12. Offerte esatte, dettaglio retailer simulato, confronto e preferiti.
13. Mobile ASK/Configure/Discover senza overflow orizzontale.

## Screenshot

- `artifacts/screenshots/desktop-ask-empty.png`
- `artifacts/screenshots/desktop-ask-revealed.png`
- `artifacts/screenshots/desktop-configure.png`
- `artifacts/screenshots/desktop-discover-searching.png`
- `artifacts/screenshots/desktop-discover-complete.png`
- `artifacts/screenshots/mobile-configure.png`
- `artifacts/screenshots/mobile-discover.png`
- `artifacts/screenshots/mobile-flow-discover.png`

## Caveat

- Dati sintetici: nessuna AI, backend, rete, acquisto o link retailer reale.
- Le caratteristiche personalizzate non sono verificabili e non filtrano i prodotti.
- Il filtro prezzo usa il totale consegnato confermato più basso della fixture.
- Nessun commit, push o pubblicazione è stato eseguito.
