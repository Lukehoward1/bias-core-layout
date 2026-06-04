# StreamBias — Project Status

## Completed

### Data & Architecture
- Server-side caching proxy at /api/quote and /api/timeseries — Twelve Data API key server-side only (TWELVE_DATA_API_KEY in Vercel env vars)
- Demo seed data: 90 trades Dec 2025–May 2026, £140k demo account, entry/exit times for session analysis
- Live FMP calendar wired across asset cards, Markets page, Historical Trend Chart, Watchlist card, and shared calendarData service
- All static calendar/news placeholders replaced with live FMP (live primary, static fallback)

### Dashboard
- All hardcoded dashboard cards replaced with live data: active-trades, next-session, performance-overview, risk-snapshot, reports-kpi-total-pnl, reports-kpi-avg-rr, reports-kpi-win-rate, reports-kpi-expectancy, reports-overview-best-day, reports-overview-worst-day, pinned-journal-equity, reports-overview-equity, reports-overview-rolling30
- Trading sessions use real UTC market hours with live countdown
- Upcoming Events card uses live FMP feed

### Journal & Reports
- Add Trade dialog: pair selector, Long/Short toggle, SL/TP, date, notes, rating, actualR calculation
- Trade timestamps (entryTime/exitTime) added to data model and form
- Reports: Sessions, Psychology (hold-time), and Risk calculate from real trade data with honest empty states
- Demo trades backfilled with session-distributed entry/exit times

### Risk Tools
- Position Size, Daily Risk Limit, Max Drawdown Guard all account-aware with correct GBP currency and Mode: Linked/Manual badge

### Education
- Guides and Trading Tips as separate sidebar items (URL-driven via useSearchParams)
- No landing hub — direct navigation to content lists
- Reader modal with proper heading/paragraph rendering
- Calculated read times, level filter on Guides
- 12 articles + 6 tips imported

### Smart Search
- Live search in AppHeader: assets (WHITELIST_SYMBOLS with bias), education articles/tips, page shortcuts
- Grouped dropdown results, keyboard navigation, click-outside close
- Education page handles ?article=ID and ?view=tips&tip=ID to open specific content

### Infrastructure
- Deployed on Vercel with auto-deploy on push to main
- vercel.json configured for SPA routing + /api/* serverless functions
- PROJECT_STATUS.md maintained at project root

## Known Approximations (not bugs)
- ReportsRiskManagement uses lots×100 as pseudo-£ risk proxy (no SL-based risk yet)
- Active Trades card shows 0 (demo trades are all "closed" — will show real open trades when broker connected)

## Remaining — Pre-Launch
- Community page: currently static placeholder trade ideas — needs real structure
- Custom domain setup on Vercel
- Auth / real user accounts
- Real broker integration (currently demo only)
- Billing/Stripe (plan toggle is a dev switch)
- Smart Search Tier 2: AI-generated explanations for concepts

## Remaining — Post-Launch
- AutomatedStrategyLab, StrategyTester, ManualBacktesting, FundingChallengeSim (simulation logic stubbed)
- Courses section in Education (SHOW_COURSES = false, code intact)
- Webinars page
