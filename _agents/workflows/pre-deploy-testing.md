---
description: Pre-deploy testing and evaluation checklist to verify all features before handing off to users
---

# Pre-Deploy Testing & Evaluation Workflow

// turbo-all

This workflow must be executed before every deployment to production. It embeds testing into the design process so that handoff reports are explicit about what works, what's broken, and what requires user action.

## 1. Build Verification

Run the production build and ensure zero errors:

```bash
cd /Users/nonatobin/CAMINO_APP_FIXER_AGENT/Camino-Pilgrim-App && npm run build 2>&1
```

**Pass criteria:** `✓ built in Xs` with no errors. Warnings about chunk size are acceptable.

## 2. Environment Variable Audit

Check that all required environment variables are set in `.env`:

```bash
cd /Users/nonatobin/CAMINO_APP_FIXER_AGENT/Camino-Pilgrim-App && grep -E "^(VITE_|NOTION_|GEMINI_)" .env | sed 's/=.*/=***/' 
```

### Required Variables Checklist

| Variable | Purpose | How to Verify | Who Provides |
|----------|---------|---------------|-------------|
| `VITE_GEMINI_API_KEY` | Voice Assistant + Fixer Agent | Must start with `AIza` | User (Google AI Studio) |
| `VITE_GOOGLE_MAPS_API_KEY` | Route Map + Nearby Places | Must start with `AIza`, needs billing enabled | User (Google Cloud Console) |
| `VITE_OPENWEATHER_API_KEY` | Weather panels | Must be 32-char hex string (NOT `AIza...`) | User (openweathermap.org) |
| `NOTION_API_KEY` | Bug reports, leaderboard | Must start with `ntn_` | User (Notion integrations) |
| `NOTION_BUG_REPORTS_DB_ID` | Bug database | Must be UUID format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Code (extracted from URL) |
| `NOTION_FEATURE_SUGGESTIONS_DB_ID` | Feature requests | Must be UUID format | Code (extracted from URL) |
| `NOTION_LEADERBOARD_DB_ID` | Family leaderboard | Must be UUID format | Code (extracted from URL) |

**Key Format Validation:**
- Google API keys: `AIzaSy...` (39 chars)
- OpenWeather keys: `abcdef1234567890...` (32-char hex, NO `AIza` prefix)
- Notion tokens: `ntn_...`
- Notion DB IDs: UUID with dashes

## 3. Vercel Environment Sync

Verify that Vercel has the same keys as local `.env`:

**Manual check:** Go to Vercel Dashboard → Project → Settings → Environment Variables
- All `VITE_*` variables must be present (they're baked into the JS at build time)
- All `NOTION_*` and `GEMINI_*` variables must be present (used by serverless functions)

## 4. Feature Verification Matrix

Test each feature and record results:

### Core Features (Code-Only — No User Dependency)

| # | Feature | How to Test | Pass Criteria |
|---|---------|-------------|---------------|
| 1 | App loads | Open URL in browser | No white screen, components render |
| 2 | Onboarding wizard | Complete 8 steps | Profile saved to localStorage |
| 3 | Training plan generates | Complete onboarding | Plan with weeks/days appears |
| 4 | Walk timer starts/stops | Tap Start Walk, wait, Stop | Timer counts, distance updates |
| 5 | PWA manifest valid | Fetch `/manifest.json` | Valid JSON with icons, display:standalone |
| 6 | Service worker registers | Check browser console | `[SW] Registered` log message |
| 7 | iOS install prompt (Safari) | Open in iOS Safari | 3-step numbered wizard appears |
| 8 | Android install prompt | Open in Chrome Android | "Install App" button appears |
| 9 | Beta landing page | Open `/beta-landing.html` | Banner, Fixer Agent button, install flow |
| 10 | QR code scannable | Scan with phone camera | Opens correct URL |

### API-Dependent Features (Require Valid Keys)

| # | Feature | API Key Required | How to Test | What Happens Without Key |
|---|---------|-----------------|-------------|-------------------------|
| 11 | Fixer Agent voice | `VITE_GEMINI_API_KEY` | Tap Fixer Agent → Mic | Shows "Gemini API key missing" |
| 12 | Trail Guide voice | `VITE_GEMINI_API_KEY` | Tap mic in Trail Guide | Shows "API key not configured" |
| 13 | Weather (real data) | `VITE_OPENWEATHER_API_KEY` | Check weather panel | Shows "Demo" badge with fake data |
| 14 | Route Map | `VITE_GOOGLE_MAPS_API_KEY` (+ billing) | Go to Walk Tracker | Shows "Map Loading" with error |
| 15 | Nearby Places | `VITE_GOOGLE_MAPS_API_KEY` (+ Places API) | Start tracking + check | Shows "Google Maps API key not configured" |
| 16 | Camino Route Preview | `VITE_GOOGLE_MAPS_API_KEY` (+ billing) | Go to Training Plan | Shows text-based fallback |
| 17 | Bug reports | `NOTION_API_KEY` + `NOTION_BUG_REPORTS_DB_ID` | Submit bug via Fixer | Silently fails (logged to console) |
| 18 | Leaderboard sync | `NOTION_API_KEY` + `NOTION_LEADERBOARD_DB_ID` | Enter share code | Silently fails |

## 5. Cross-Platform Verification

| Platform | Browser | PWA Install | Voice | Map |
|----------|---------|-------------|-------|-----|
| iPhone | Safari | Share → Add to Home Screen | Requires mic permission | Requires billing |
| iPhone | Chrome | ❌ Cannot install (Apple restriction) | Works in-browser | Requires billing |
| Pixel/Android | Chrome | Install banner auto-triggers | Requires mic permission | Requires billing |
| Samsung | Chrome | Install banner (may show safety warning) | Requires mic permission | Requires billing |
| Desktop | Chrome | Install icon in address bar | Works | Requires billing |
| Desktop | Safari | ❌ Cannot install | Limited (no AudioWorklet) | Requires billing |

## 6. Handoff Report Template

After completing all tests, generate a handoff report using this format:

```markdown
# Deployment Handoff Report — [Date]

## ✅ Features Verified Working
- [List each feature that passed testing]

## ⚠️ Features Requiring User Action
- [Feature]: Requires [specific action]. Without it: [consequence].

## 🔴 Features Broken (Code Issue)
- [Feature]: [Root cause]. Fix: [what needs to change].

## 📋 User Action Items
1. [Specific action with URL/instructions]
2. [Next action]
...

## 🚫 Cannot Be Fixed By Code
- [Item]: [Why — e.g., Apple platform restriction, Google billing requirement]
```

## 7. Post-Deploy Verification

After pushing to production:

```bash
# Verify deployment is live with new build
curl -s https://project-bc6yc.vercel.app/ | head -5

# Verify beta landing page
curl -s https://project-bc6yc.vercel.app/beta-landing.html | grep -o '<title>.*</title>'

# Verify manifest
curl -s https://project-bc6yc.vercel.app/manifest.json | python3 -m json.tool
```
