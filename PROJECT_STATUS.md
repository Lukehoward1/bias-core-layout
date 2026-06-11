# StreamBias — Project Status

## Completed

### Data & Architecture
- Server-side caching proxy at /api/quote and /api/timeseries — Twelve Data API key server-side only
- Demo seed data: 90 trades Dec 2025–May 2026, £140k demo account, entry/exit times for session analysis
- Live FMP calendar wired across all components — live primary, static fallback
- All hardcoded dashboard cards replaced with live data

### Dashboard & Reports
- All dashboard cards live: active-trades, next-session, performance-overview, risk-snapshot, all KPI cards, equity curves
- Trading sessions use real UTC market hours with live countdown
- Reports: Sessions, Psychology (hold-time), Risk all calculate from real trade data

### Journal & Risk Tools
- Add Trade dialog: pair selector, Long/Short toggle, SL/TP, date, notes, rating, actualR
- Trade timestamps added to data model and form
- Risk tools (Position Size, Daily Risk, Max Drawdown) account-aware with GBP currency

### Education & Smart Search
- Guides and Trading Tips as separate sidebar items
- Reader modal with proper formatting, calculated read times, level filter
- Smart Search: assets, education articles, page shortcuts with keyboard navigation

### Auth (Supabase)
- Login, Register, Forgot Password, Reset Password pages
- Protected routes — all app routes require authentication
- Email confirmation flow with Resend SMTP (hfx-capital.com domain verified)
- AuthCallback page handles email confirmation redirect
- Card-required trial flow: register → confirm email → Stripe checkout → dashboard

### Payments (Stripe)
- Three products: Standard (£19/mo, £190/yr), Pro (£29/mo, £290/yr), Founding Member (£197/yr)
- 7-day trial, card required upfront
- Checkout session serverless function (/api/create-checkout-session)
- Customer portal serverless function (/api/create-portal-session)
- Webhook handler (/api/webhook) — processes checkout.session.completed, subscription.updated, subscription.deleted
- Profiles table in Supabase stores subscription status, tier, trial dates
- Paywall in ProtectedRoute — redirects inactive users to /pricing
- Trial banner showing days remaining with cancel option
- Billing section in Settings

### Landing Page
- Hero with mouse-tracking gradient orbs
- How it Works, Bias Engine, Journal (calendar/equity/analytics mockups), Risk, Calendar/Alerts, Education sections
- Founding Member section (£197/yr, 100 spots)
- Testimonials (3 placeholder cards)
- Demo video placeholder with email capture → Supabase demo_leads table
- 7-day trial messaging with card-required copy throughout
- Footer with nav links

### Infrastructure
- Deployed on Vercel with auto-deploy on push to main
- Custom SMTP via Resend (hfx-capital.com)
- Supabase: auth, profiles table, demo_leads table, RLS policies

## In Progress
- Post-payment redirect flow: after Stripe checkout → login page → retry profile check → dashboard
- Currently testing the retry loop (waitForProfile) to handle webhook timing delay
- NEXT TEST: register with fresh email, complete Stripe checkout, sign in, verify lands on /dashboard

## Remaining — Pre-Launch
- Verify post-payment redirect works end to end ← NEXT SESSION START
- Remove debug logging from webhook once flow confirmed working
- Custom domain (streambias.com — not yet purchased)
- Terms of Service and Privacy Policy pages
- Switch Stripe from sandbox to live mode before launch
- Update Supabase Site URL when custom domain is set

## Remaining — Post-Launch
- Community page (needs auth + database backend)
- Real broker integration
- Courses section in Education (SHOW_COURSES = false)
- Automated Strategy Lab, Backtesting (simulation logic stubbed)
- Affiliate/partner programme dashboard
- Email marketing sequences (Resend — trial day 4, day 6, day 7 expiry)
