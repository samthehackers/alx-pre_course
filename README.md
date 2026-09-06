# Folklore

A demo/prototype AI platform for real-time video and real-time voice-changer
experiences, with credit-based usage. Built as a single Node/Express app —
server-rendered EJS views, a small JSON-file data store, and a single
configured demo account (no public multi-user signup).

## Run it

```
npm install
npm start
```

Then open http://localhost:3000.

Sign in with the demo account shown on the sign-in page
(`demo@folklore.ai` / `FolkloreDemo123`, or use the "Use demo credentials"
button).

## Structure

- `server.js` — routes, session auth, view rendering, API endpoints.
- `lib/config.js` — product/pricing config and the demo account.
- `lib/store.js` — JSON-file persistence (`data/app-data.json`) and seed
  generation for transactions/usage history (March 2026 → today).
- `lib/credits.js` — centralized credit ledger: purchases, usage sessions,
  and purchased/used/remaining balances. Nothing hardcodes a balance
  elsewhere — every page reads from here.
- `lib/auth.js` — single-account session login/logout + route guards.
- `views/` — EJS templates: public marketing site, auth pages, and the
  authenticated app (dashboard, usage, credits, billing, transactions,
  account, real-time video, real-time voice changer).
- `public/` — design-system CSS, per-page JS, and hand-built SVG brand
  visuals (no external image-generation tool was available in this
  environment, so the "AI-generated visuals" are custom SVG/gradient
  artwork in a consistent style instead of raster images).

## Notes on the prototype nature

- Credit purchases are simulated — there is no real payment processor.
  Checkout UI says so explicitly. The transaction history itself just
  looks like a normal purchase ledger (no demo/test labels on the rows).
- Real-Time Video uses the browser's camera via `getUserMedia` for a live
  local preview. Real-Time Voice Changer uses the Web Audio API
  (ring modulation / filters) to actually transform your microphone audio
  in real time — it's a simplified DSP effect, not a neural voice model.
- Session usage is billed at $2.00/min (video) and $1.00/min (voice) against
  the purchased credit balance, deducted when a session stops.
