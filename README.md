# Demo Transaction History

A small demo app showing a persisted transaction history page. **All data is
simulated sample data** — the "DEMO MODE" banner on the page makes this
explicit, and no real payments are processed.

## Run it

```
npm install
npm start
```

Then open http://localhost:3000.

## How it works

- On first run, `lib/transactionStore.js` seeds `data/transactions.json` with
  a naturally-spaced chronological purchase history starting March 2026
  through today, alternating between the two demo products:
  - Real-Time Video Credit — $20.00
  - Real-Time Voice Changer Credit — $10.00
- The seed only happens once; the file is then read on every page load, so
  refreshing the page does not regenerate or duplicate transactions.
- The "Simulate Purchase" buttons call `POST /api/transactions/simulate` to
  append a new transaction dated today, which is persisted the same way.
