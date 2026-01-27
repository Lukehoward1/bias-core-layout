# Journal Tier Gating System

## Overview
The Journal page implements plan-based access control using blur-based gating. Features remain visually present but are blurred with an upgrade prompt for users on lower-tier plans.

## Plan Permissions

### Free Plan
- ✅ Manual trade entry
- ✅ View trade list  
- ✅ Basic equity curve
- ❌ Analytics (blurred)
- ❌ Reports (blurred)
- ❌ Export reports
- ❌ Auto-journaling

### Standard Plan
- ✅ All Free features (unlocked)
- ✅ Analytics
- ✅ Reports
- ✅ Export reports
- ✅ Auto-journaling
- ❌ Advanced comparisons (Premium)
- ❌ Deep aggregation (Premium)

### Premium Plan
- ✅ All Standard features
- ✅ Advanced comparisons
- ✅ Deep aggregation

## Key Components

### FeatureGate Component
`src/components/journal/FeatureGate.tsx`
- Wraps content with blur overlay when `isLocked=true`
- Shows non-intrusive upgrade prompt with "View Plans" link
- Supports compact mode for smaller cards

### Subscription Types
`src/types/subscription.ts`
- Extended `PlanLimits` interface with `journal` permissions object
- Helper functions: `canAccessJournalAnalytics()`, `canAccessJournalReports()`, etc.

### Plan Switcher (Dev Mode)
`src/pages/Settings.tsx`
- Temporary UI for testing tier gating
- Persists plan to localStorage
- Will be replaced with real billing integration

## Gating Implementation in Journal.tsx
1. Auto-Journaling indicator shows locked/unlocked state
2. Reports tab content wrapped in FeatureGate
3. Export All button disabled for Free users
4. Star ratings remain cosmetic (no insights gated behind them)
