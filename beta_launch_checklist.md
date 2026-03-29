# Camino Pilgrim App — Beta Launch Checklist

> **Last updated:** March 29, 2026  
> **Release:** v0.1.0-beta  
> **Launch coordinator:** AI Grandma Nona + Nona Tobin

---

## Code & Repository

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Full-stack app rebuilt (React/Tailwind/Express/SQLite) | ✅ Done | Firebase dependencies removed, deployed on Perplexity |
| 2 | All 9 modules committed (Dashboard, Training Plan, Walk Tracker, Health Monitor, Camino Journal, Route Map, Family Leaderboard, Badges, Settings) | ✅ Done | Verified in repo |
| 3 | Route Map with 6 Camino stages + lodging info | ✅ Done | Baiona → Santiago |
| 4 | Voice assistant (Gemini 3.1 Flash Live + Web Speech API) | ✅ Done | Hands-free interaction |
| 5 | Translate panel with Gemini fallback | ✅ Done | Google Translate optional |
| 6 | Weather + Nearby Places integration | ✅ Done | OpenWeather + Google Places APIs |
| 7 | Family Leaderboard with share codes | ✅ Done | 6-character codes |
| 8 | Badge system (6 badges) | ✅ Done | Trail Star through Santiago Bound |
| 9 | Feature flags for gradual rollout | ✅ Done | .env.example documented |
| 10 | Calendar sync (Google Calendar OAuth) | ✅ Done | OAuth flow in api/ routes |

## Security & Configuration

| # | Item | Status | Notes |
|---|------|--------|-------|
| 11 | `.env.example` with all variable placeholders | ✅ Done | No real keys exposed |
| 12 | `.gitignore` blocks `.env*` (except `.env.example`) | ✅ Done | Verified |
| 13 | `env_setup_guide.md` committed | ✅ Done | Local + Vercel instructions |
| 14 | No API keys in commit history | ✅ Done | Clean repo audit |

## Beta Tester Distribution Packet

| # | Item | Status | Notes |
|---|------|--------|-------|
| 15 | Welcome email template | ✅ Done | Saved to Google Drive |
| 16 | One-page onboarding guide (PDF) | ✅ Done | Terracotta/shell-gold palette, saved to Google Drive |
| 17 | Bug report form (Notion database) | ✅ Done | Needs Notion form view created manually |
| 18 | Feature request form (Notion database) | ✅ Done | Needs Notion form view created manually |
| 19 | `beta_version_log.md` committed to GitHub | ✅ Done | v0.1.0-beta entry logged |

## Release & Distribution

| # | Item | Status | Notes |
|---|------|--------|-------|
| 20 | GitHub Release `v0.1-beta` created with release notes | ✅ Done | Tag + release notes published |
| 21 | Outreach messages drafted (4 audiences) | ✅ Done | `outreach_messages.md` in repo |
| 22 | `beta_launch_checklist.md` committed to GitHub | ✅ Done | This file |

## Manual Steps Required (Nona's To-Do)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 23 | Replace `[App Link]` placeholders in all outreach messages | ⏳ Pending | Insert deployed Perplexity/Vercel URL |
| 24 | Replace `[Video Link]` in welcome email with AI Grandma Nona intro video | ⏳ Pending | Video asset needed |
| 25 | Create Notion form views for bug report + feature request databases | ⏳ Pending | Open each DB → Add View → Form |
| 26 | Paste actual API keys into `.env.local` / Vercel dashboard | ⏳ Pending | Follow `env_setup_guide.md` |
| 27 | Send outreach messages to HOA neighbors | ⏳ Pending | Copy from `outreach_messages.md` |
| 28 | Post to Skool community | ⏳ Pending | Copy from `outreach_messages.md` |
| 29 | Post to AI subscription group | ⏳ Pending | Copy from `outreach_messages.md` |
| 30 | Send personal message to 9 Camino pilgrims | ⏳ Pending | Copy from `outreach_messages.md` |
| 31 | Confirm app is accessible at deployed URL | ⏳ Pending | Test on phone + tablet |
| 32 | Test onboarding flow end-to-end on a real device | ⏳ Pending | Walk through as a new user |

---

## Summary

- **Automated items completed:** 22/22
- **Manual items pending:** 10/10
- **Blockers:** None — all manual items are ready for Nona to execute

> *31 days to Baiona. Buen Camino.* 🐚
