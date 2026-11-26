# StreamBias — Project Status
_Last updated: 2026-11-26_

## Live now

### Auth & Payments
- Supabase auth: sign-up, sign-in, email confirmation, password reset, auth callback
- Terms/Privacy checkbox on sign-up; protected routes gate all app pages
- Stripe: Standard (£29/mo · £299/yr), Pro (£45/mo · £495/yr), Founding Member (£299/yr, 100 spots, no trial)
- 7-day free trial, card required; Stripe checkout + customer portal + webhook handler
- Subscription status stored in Supabase `profiles`; paywall in ProtectedRoute
- Trial banner, cancel flow, downgrade grace flow

### Trade Screen (centrepiece)
- Full interactive chart: 1m 5m 15m 1H 4H 1D, candlestick + other styles, zoom, crosshair, OHLC readout, fullscreen
- Overlay toggles (Levels, News, Sessions, Swings) with localStorage persistence
- Levels: key reference price-lines with axis labels (Previous High/Low, Strong Reaction Zone, BRT, Liq Sweep, Nearby Target)
- Sessions: London + NY open hairlines, intraday TFs only (hidden on 4H+)
- Swings: SH/SL markers + short canvas segment lines for nearest unbroken swings
- News markers: rendered as HTML pill callouts; pill placement avoids level tags and swing labels
- Swing segment lines cleared correctly when overlay list empties
- Pair selector with watchlist stars; Scalper / Intraday / Swing / Custom TF presets
- Always-on side panel: Combined Bias + confidence, per-TF bias + reason, Volume, Next High-Impact News, Nearest Levels, 3-of-3 checklist, Dynamic Risk, I'm in a Trade
- I'm in a Trade: draws entry / stop / target as chart lines
- Mobile: swipe-up market panel, quick-status chip row, pair sheet
- Tab-refocus no longer remounts the app (same-user Supabase token refresh handled without re-fetching)

### Bias Engine
- Three user-chosen timeframes (Bias 50%, Structure 30%, Entry 20%)
- Reads last closed candle vs previous: bullish / bearish / rejection / neutral
- Verdict: Active / Weakening / Neutral-Ranging with confidence score
- Presets: Scalper 1H/15m/5m · Intraday 4H/1H/15m · Swing 1W/1D/4H

### Dashboard
- Customisable cards: drag, add, remove
- Markets at a Glance, Watchlist Overview, performance KPIs, equity curve, session countdown, risk snapshot
- Asset overlay from Dashboard (AssetDetailContent)

### Review (Journal + Risk)
- Manual trade entry, CSV import, MT4/MT5 broker sync (Pro; live status unconfirmed)
- Tags (16 defaults + custom), star rating, notes, session planning
- Auto P&L, profit rate, R:R, profit factor, session/weekday breakdowns
- 8 reports: Overview, Performance, Psychology, Risk Management, Sessions, Setup Quality, Assets, Trade Log
- Psychology report: keyword sentiment, emotional triggers, hold-time, improvement focus
- Dynamic Risk: session/setup/weekday splits vs overall record (needs ≥20 trades per split)

### Risk Tools
- Position Size Calculator, R/R Calculator, Quick Risk Calculator, Daily Risk Limit Tracker, Max Drawdown Guard
- Dynamic Risk (also in Trade side panel)

### Alerts
- Price alerts (wick or close, 1m–1W); calendar-event alerts
- Run only while StreamBias is open; device-local storage; no push/email/SMS delivery
- Session-reminder / bias-flip / summary toggles exist in UI but do not generate alerts yet

### Education
- ~18–20 guides + Trading Tips (count unconfirmed)
- Reader modal with formatting, read time, level filter

### Other
- Smart Search: assets, guides, page shortcuts
- Settings: subscription management, trader timeframes, PIN session lock, broker connections, home currency, password change
- Support link: sidebar, Settings, 404 page (support@streambias.com)
- Vercel deploy; Supabase; Resend SMTP (hfx-capital.com)

---

## Built, not yet live

- **Economic Calendar**: page shows "Coming Soon"; FMP live feed not connected. Once connected, news markers appear on Trade chart.
- **Replay Mode**: toolbar button removed (placeholder). Candle-step engine exists but no UI.

---

## Open / unconfirmed at launch

- Live Stripe keys status
- Gold (XAUUSD) and NAS100 live data
- Founding Member exact feature set and remaining spots
- Broker sync (MT4/MT5) working on live site
- Standard plan — whether "1 broker account" means sync or manual
- Which lifecycle emails (trial day 4/6/7) are live in Resend

---

## Roadmap (not built)

- Live economic calendar + news markers on chart
- Replay / simulator UI
- Post-release news markers showing 5/15/60-min price move after event
- Ask StreamBias (AI search box, finance-only, daily limits)
- Journal trade overlays on event charts
- Crypto and stocks
- Affiliate/partner dashboard
- Community page
