# Folklore

An AI platform for real-time video and real-time voice-changer experiences,
with simple credit-based usage. A single Node/Express app — server-rendered
EJS views, a centralized credit ledger, and a full authenticated dashboard
(usage, credits, billing, transaction history, account).

## Run it

```
npm install
npm start
```

Then open http://localhost:3000.

### Access

The app runs on a single managed account rather than open registration.
Credentials are shared directly by the site owner — the Sign Up page points
visitors to request access, then sign in with the credentials they're given.

## Structure

- `server.js` — routes, session auth, view rendering, API endpoints.
- `lib/config.js` — product/pricing config and the demo account.
- `lib/store.js` — JSON-file persistence (`data/app-data.json`) and seed
  generation for transactions/usage history (March 2026 → today).
- `lib/credits.js` — centralized credit ledger: purchases, usage sessions,
  and purchased/used/remaining balances. Nothing hardcodes a balance
  elsewhere — every page reads from here.
- `lib/auth.js` — session login/logout + route guards.
- `views/` — EJS templates: public marketing site, auth pages, and the
  authenticated app (dashboard, usage, credits, billing, transactions,
  account, real-time video, real-time voice changer).
- `public/` — design-system CSS, per-page JS, and custom SVG brand visuals.

## Notes

- Real-Time Video uses the browser's camera via `getUserMedia` for a live
  local preview. Real-Time Voice Changer uses the Web Audio API
  (ring modulation / filters) to transform microphone audio in real time.
- Session usage is billed at $2.00/min (video) and $1.00/min (voice) against
  the purchased credit balance, deducted when a session stops.
- Deployed on Vercel; the data store lives under `/tmp` there since the
  deployed filesystem is otherwise read-only, and sessions use a signed
  cookie so login works consistently across serverless instances.
