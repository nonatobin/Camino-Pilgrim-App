# 🚑 Ship Tonight — AntiGravity Prompt Package (Camino Pilgrim App)

## 📖 EXPLANATION — Do Not Copy This Section

Goal: give you one paste-ready package to hand to AntiGravity with the least HITL.

This package:

- Supplies the current constitution + UX decisions + screenshots location
- Instructs AG to audit, reproduce, fix, and ship (deploy + verify)
- Explicitly includes the iCloud/Apple Calendar constraint + recommended web-friendly approach (ICS/subscription)

If you only do one thing: copy Prompt #1 below into AntiGravity.

---

## ▶️ START HERE — Prompt #1: Copy Everything Below

<aside>
📋

⬇️ COPY THIS ENTIRE BLOCK — Paste into AntiGravity. This is the only thing you need to paste.

</aside>

```
# CAMINO PILGRIM APP — SHIP TONIGHT REVISION PACKAGE
# Target: AntiGravity IDE (lowest HITL)
# Timebox: ship-ready tonight
# Owner: Nona Tobin

## 0) SINGLE SOURCE OF TRUTH (READ FIRST)
You MUST use these Notion pages as canonical context:
1) Project Constitution (claude.md): https://www.notion.so/16a102c9a4af43cc93121eb1f6a802e3
2) UX Spec (Training calendar + buttons): https://www.notion.so/09527ce481d64be78746464af4a765af
3) AG Audit + Fixer Agent prompts (reference only if needed): https://www.notion.so/d115aa16329749578ebb2debae7da417
4) Build prompt (reference): https://www.notion.so/dba0de41396c4d2596eabc49f1ade40a
5) Live build + install instructions / current state (reference): https://www.notion.so/545c1de4b7cc4cac95ac6111f8f9d95e

## 1) YOUR MISSION (OUTCOME)
Make the Camino Pilgrim web app revision ship-ready tonight.
“Ship-ready” means:
- Calendar Sync behaves correctly and never silently fails
- Training calendar concept is implemented as: Suggested vs Accomplished tracking
- Errors are surfaced to user in plain language
- Deployment is verified live (Vercel) after changes

## 2) NON-NEGOTIABLE GUARDRAILS
- Pessimistic developer: assume everything is broken until proven.
- Reproduce-then-fix: do NOT patch until you reproduce with logs and/or browser automation.
- No hardcoded API keys in client bundle or repo.
- Accessibility: minimum 18px text, 48px touch targets, high contrast.
- No silent failure: every click must show success or a human-readable reason.

## 3) PRIORITY FIX LIST (TONIGHT)
### P0 — Calendar Sync button
From UX spec: Calendar Sync button appears to do nothing.
Required states:
A) Not connected → show status + Connect button
B) Connected → show account/calendar + last sync time + Add next 7 days + Remove suggested events
C) Error → show human-readable error + Try again

Critical constraint:
- Support Apple/iCloud too.
- Web apps generally cannot write directly into Apple Calendar via API like Google.
- Therefore implement Apple/iCloud support via one of:
  1) Generate and download an .ics file for suggested events (best immediate)
  2) Provide a subscription calendar feed URL (if feasible quickly)
  3) iOS flow that opens the .ics via share sheet / calendar add

### P0 — Suggested vs Accomplished model
Implement two distinct tracks:
- Suggested schedule (plan-generated events)
- Accomplished log (what actually happened)
No shame messaging for missed days.

### P1 — Leaderboard beta mode
Everyone in beta group participates.
If not actually starting Apr 30:
- Offer “BETA Only” option OR
- Temporarily assign Apr 30 for beta scoring.

### P1 — Translate
Default to phrasebook-only.
Add a clear button/link to open the full Translate app/experience (do NOT embed keys client-side).

## 4) EVIDENCE / REPRO INPUTS
Use screenshots embedded in the UX spec page for current UI + onboarding.
Also review the current “app opening page” screenshot there.

## 5) EXECUTION PLAN (DO THIS IN ORDER)
1) Load and read the constitution + UX spec pages listed above.
2) Run the app locally (or in preview) and reproduce:
   - Calendar Sync “does nothing”
   - Any errors in console/network
3) Implement fixes for P0 items first.
4) Add explicit user-facing status + toasts/messages for success/failure.
5) Add Apple/iCloud path via .ics generation for suggested events at minimum.
6) Run verification:
   - Browser automation or manual scripted checks
   - Confirm Calendar Sync works for Google (API) and Apple (ICS)
7) Commit changes with a concise session summary.
8) Deploy to Vercel.
9) Verify production:
   - Confirm Calendar Sync behaves correctly
   - Confirm no keys exposed

## 6) DELIVERABLES (MANDATORY)
Provide:
A) A short “What shipped tonight” summary
B) A checklist with PASS/FAIL for:
   - Calendar Sync states
   - Suggested vs accomplished
   - Apple/iCloud (ICS)
   - Leaderboard beta mode
   - Translate link
C) Links:
   - Git commit(s)
   - Vercel deployment URL
D) Remaining known issues (if any) with next actions

## 7) LOOP BREAKER
If you hit the same blocker twice, STOP and produce:
- Root cause hypothesis
- What you tried
- What will be different next attempt
- The minimum HITL question needed
```

## ⛔ END HERE — Stop Copying

---

## 📖 EXPLANATION — Reference Only (Do Not Copy)

If AntiGravity asks for “where are the screenshots?”: they’re embedded in [Camino Pilgrim App — Onboarding + Buttons: UX Copy & Behavior Spec](https://www.notion.so/Camino-Pilgrim-App-Onboarding-Buttons-UX-Copy-Behavior-Spec-09527ce481d64be78746464af4a765af?pvs=21) under “Visuals” and near the Calendar Sync section.

If you end up using Claude Co-work instead of AntiGravity, paste the same Prompt #1 into Co-work and instruct it to output a second, smaller prompt specifically for Claude Code execution.