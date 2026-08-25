# StreamBias Launch Timeline

Audit date: 25 August 2026. Three phases, in order: pre-marketing UI/data fixes, marketing prep, final site changes for launch. Each item below is flagged **Must-fix** (blocks launch or is user-facing broken/embarrassing) or **Should-fix** (visible gap, not launch-blocking on its own).

---

## Phase 1 — Pre-Marketing: UI & Data Fixes

Everything here should happen before recording demos or taking screenshots, since it affects what the product actually looks like on camera.

### Must-fix

- **Terms of Service pricing is wrong.** `Terms.tsx` lists Standard £19/mo, Pro £29/mo, Founding £197/yr — the real, live pricing is £29/£45/£299. This is a live legal document quoting the wrong numbers to anyone who reads it. Quick text fix, but must happen before anyone signs up under it.
- **Economic calendar is FMP-paywalled.** Both the legacy and current FMP endpoints now return 402/403 for the current plan. Production correctly shows a "Coming Soon" state rather than breaking, so this isn't visually broken — but it's a feature gap. Resolve by upgrading the FMP plan (~$25/mo Starter tier) or waiting for the pending $800/mo forex/commodities/indices deal (which already includes calendar access) to activate.
- **Journal fetch/save failures are silent.** In `use-journal-trades.ts`, a failed trade fetch just renders an empty journal with no error message, and a failed manual trade save silently rolls back with no toast — a user could log a trade, see it vanish, and get no explanation. Worth a minimum-viable error toast before real users hit this.
- **Orphaned pages need a decision.** Five fully-built pages exist in the codebase but aren't linked from any route or nav — `Brokerage.tsx`, `ManualBacktesting.tsx` (mock OHLC data), `Webinars.tsx` (hardcoded fake hosts), `FundingChallengeSim.tsx` (placeholder data), `AutomatedStrategyLab.tsx` ("Real charts coming soon"). A dedicated `Billing.tsx` page with a stale, different pricing table is also unrouted (the real `/billing` route just redirects to `/settings`). Decide per page: finish and wire in, or delete the dead code — right now they're built but unreachable, which is just confusing clutter in the repo.

### Should-fix

- **Calendar UI still needs the full polish pass** you deferred this session (event list styling, historical trend chart, modal) — worth finishing once real data is flowing, so screenshots/demos show the finished version, not the interim pill-filter version.
- **No visible support/contact channel.** `support@streambias.com` only appears inside the Terms/Privacy legal text — nothing in the footer, Settings, or the 404 page. Cheap to add, and matters if marketing drives people who then can't find how to ask a question.
- **Mobile responsiveness is thin.** Dashboard and Risk Tools have zero responsive Tailwind classes — likely to look broken on phone/tablet widths. Worth at least checking these two pages at common breakpoints before any mobile-facing marketing (e.g. Instagram/TikTok demo clips shot on phone).
- **Minor "coming soon" stubs scattered through the UI** (chart toolbar extras, replay mode, some instruments' bias unavailable, a few extra currency pairs in event/session modals). None are broken, all show clear messaging — just worth a final pass so demos don't accidentally land on one.
- **No terms-agreement checkbox at signup.** Not a legal blocker for a UK sole trader, but standard practice worth adding.
- **Incorporation placeholder in Terms/Privacy** (`[PLACEHOLDER — UPDATE ON INCORPORATION]`, currently operating as a sole trader). Not blocking — sole traders can legally trade — but resolve deliberately rather than leaving the placeholder string live, especially once marketing starts driving traffic to those pages.

---

## Phase 2 — Marketing Prep

Once the Must-fix items above are done (and ideally the calendar polish + mobile pass too, since those affect what's on screen), this is clear to start:

- Record demo videos of the core flows: journal entry, dashboard/bias engine, risk tools, reports/tearsheet export, calendar.
- Take screenshots for landing page, App Store style previews, and social teasers.
- Draft and schedule teaser posts — you'll have real UI to show by this point rather than placeholder states, which matters since several "coming soon" stubs would otherwise show up in raw screen recordings.
- Decide what to say (or not say) publicly about broker support scope — MT4/MT5 only at launch (covers ~85% of the market) — so messaging doesn't overpromise Topstep/TradeLocker/Tradovate support that isn't built yet.

---

## Phase 3 — Final Site Changes for Launch

These are launch-window switches — deliberately last, since some involve real spend or real payment processing you don't want live during testing/demo recording:

- **Switch Stripe to live keys.** Confirmed the current `.env` and codebase are wired correctly, but running in test mode (`sk_test_...`). Production Vercel env vars need the live keys set right before go-live, not before — keep test mode through the demo/marketing phase to avoid accidental real charges.
- **Activate the FMP calendar deal** (or standalone Starter plan) and switch `api/economic-calendar.ts` back to the `/stable/` endpoint once you're actually ready to pay for it — matches your stated plan to hold off spend until closer to launch.
- **Touch base with Laith at FMP** to formally start onboarding once you're launch-ready (he's holding pricing, no time pressure from his side).
- **Final QA pass** across the Must-fix and Should-fix items above — confirm nothing regressed, and specifically re-check the "coming soon" stub list to decide if any need hiding vs. shipping as-is.
- **Delete dead code** identified in the audit (unrouted pages, if not wired in; stale `Billing.tsx`; unused `ReportBuilder.tsx` component) — housekeeping, not urgent, but cleaner to do once and not carry into a live launch.

---

## Quick reference: what's already solid (no action needed)

- MT4/MT5 broker sync — fully working end-to-end (connect, 5-min poll, disconnect, cron cleanup).
- Reports/tearsheet PDF generation — complete, all 8 presets built and verified.
- Cookie consent banner — real, GDPR-aware, gates analytics correctly.
- Stripe billing logic — checkout, webhooks, tier limits, self-service cancellation via Billing Portal all correctly wired (just needs live keys at launch).
- Guides + Trading Tips — 18 fully-written articles/tips, matches marketing copy accurately. Note: hardcoded, not CMS-backed, so future additions need a code deploy.
- Onboarding/signup flow — reviewed end-to-end, no dead ends.
- Daily orphan-sweep cron — working as intended, heartbeat email only, no action needed unless it flags a sweep.
