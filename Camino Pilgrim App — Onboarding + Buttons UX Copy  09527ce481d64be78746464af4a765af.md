# Camino Pilgrim App — Onboarding + Buttons: UX Copy & Behavior Spec

## Goals

- Every bottom-nav button must either (a) do something immediately, or (b) clearly explain what it will do, why it matters, and what the user needs to do next.
- The app should feel encouraging and playful. No scolding.
- Any feature that requires setup (calendar, reminders, translate) must show clear status + one next step.

---

## Bottom nav: required behavior + microcopy

### 1) Training Plan (Home)

**Current problem:** training plan exists, but there’s no explanation for how it was created or why it matters.

**What it is (explain to user):**

- The plan is a gentle ramp to help avoid injury and build consistency before a long walk.
- It was generated from the user’s start date + baseline + preferred wake-up time (so suggestions land after the user is typically awake).

**On-screen copy (short):**

- Title: Training Plan
- Subtext: “A steady ramp to get you to the Camino start strong—without overtraining.”
- “Built from: your start date + your current baseline. You can change this anytime.”

**Controls:**

- Edit plan (distance ramp, rest days, start date)
- Choose “Encouraging only” tone (default)

---

### 2) Calendar Sync

![AI Grandma Nona avatar for Camino.jpeg](Camino%20Pilgrim%20App%20%E2%80%94%20Onboarding%20+%20Buttons%20UX%20Copy%20/AI_Grandma_Nona_avatar_for_Camino.jpeg)

**Current problem:** Calendar Sync button appears to do nothing.

**Required UX states:**

1. Not connected
    - Show: “Not connected”
    - Button: “Connect Calendar”
    - Explain: “We can schedule suggested training walks so they show up where you already live.”
2. Connected
    - Show: calendar account + which calendar is used
    - Button: “Add next 7 days to calendar” + “Remove suggested events”
    - Show: last sync time + count of upcoming suggested events
3. Error
    - Show human-readable error + “Try again”

**Important:**

- Never silently fail. If a click doesn’t create events, show a toast/message with why.
- Make “suggested” vs “completed” separate concepts.

---

### 3) Smart Reminders

**Current problem:** “Enable smart reminders” goes nowhere.

**What it should mean:**

- Smart reminders are *nudges* (hydration, stretch, breathing, walk) that adapt to the user’s pattern.

**Required UX:**

- If notifications permissions not granted: show OS prompt path.
- If granted: show toggles + timing rules.

**Default reminder set (non-annoying):**

- Eyes + posture break every 30 minutes while “Focus mode” is active
- Breathing: target 10×/day (but start with 3×/day default)
- Walk reminder: only if no walk logged by a user-chosen time window

**Tone rules:**

- Only encouragement.
- If missed: “No guilt—your body is still on your side. Want a 5-minute reset?”

---

### 4) Focus (Timer)

**Current problem:** Pomodoro exists, but the app doesn’t explain why it’s in a walking-training app.

**Reframe:** Focus is a flexible timer toolkit that supports training + recovery + health routines.

**On-screen copy (short):**

- Title: Focus Timer
- Subtext: “Use timers for anything: training intervals, recovery, breathing, icing, stretching.”

**Presets (tap to start):**

- “Desk reset” — 30 min focus / 2 min eyes+stretch
- “Breathing” — 3 min (expand to 10×/day)
- “Ice knee” — 10 min on / 30 min off ×3
- “Stretch” — 5 min

**Rules:**

- User can create custom presets.
- No shame messages.

---

### 5) Leaderboard (rename from Family Sync)

**Current problem:** “Family sync” name is unclear; needs habit-formation rationale + cohort model.

**Rename:** Leaderboard (or “Cohort”) 

**What it is (explain):**

- People stick to habits better in structured programs with social accountability.
- This is a lightweight cohort scorecard: consistency, not competition.

**Cohorts needed:**

- Cohort A: “Baiona Apr 30 start” (Mark’s family + Nona)
- Cohort B: “June starters” (start date TBD)

**Scoring idea (gentle):**

- +1 for any walk logged
- +1 for breathing goal met (or partial)
- Streaks get silly badges

**Badges / fun feedback examples:**

- “Tiny but mighty” (5-minute walk day)
- “Knee-whisperer” (did recovery/icing)
- “Pilgrim panda” (consistent 3 days)
- “I showed up” (any activity logged)

---

### 6) Translate

**Current problem:** last button should connect to Translate (ES/EN/PT minimum) and must not expose API keys.

**Required UX:**

- Offline-first phrasebook for the basics (no key required)
- “Live translate” as optional, with clear privacy + data note

**Languages:**

- English, Spanish, Portuguese (add French later)

**Security non-negotiable:**

- No keys in client bundle.
- No keys in GitHub.
- If a key is needed, route via serverless endpoint with strict domain/referrer restrictions.

---

## Training calendar: track suggested vs accomplished

### Two separate tracks

1) Suggested schedule (plan-generated)

- Shows proposed walks based on wake-up time and preferred window.

2) Accomplished log (what actually happened)

- User logs: distance/time, pain notes, recovery actions.
- Completion should earn a badge/emoji.

### “Missed day” handling

- Never scold.
- Convert missed days to: “Recovery day” or “Reset day” suggestion.

---

## Copy rules (tone)

- Encourage, never shame.
- Assume health constraints and variability.
- Offer the smallest next step.

---

## Open questions (need decisions)

- Calendar Sync: Support Apple/iCloud too. Note: for a web app, direct write-to-Apple-Calendar is typically not possible without native iOS integration or user-mediated flows. Likely options: (a) ICS download/add-to-calendar, (b) subscribe to a calendar feed, (c) “Add to Apple Calendar” via iOS share sheet after generating an .ics.
- Leaderboard: Applies to everyone in the beta group. If a person isn’t actually starting the Camino on Apr 30, offer a “BETA Only” mode (opt out of Camino-date-based comparisons) or assign an Apr 30 start date for beta-period scoring.
- Translate: Default to phrasebook-only. Since an API exists, add a clear link/button to open the full Translate app/experience (instead of embedding keys client-side).

# Visuals

Pictures I uploaded into chat that can be used for the Welcome email of put into the app or the screenshot of first pages be used for debugging 

![app opening page.png](Camino%20Pilgrim%20App%20%E2%80%94%20Onboarding%20+%20Buttons%20UX%20Copy%20/app_opening_page.png)

![Intro to App copy with change notes.png](Camino%20Pilgrim%20App%20%E2%80%94%20Onboarding%20+%20Buttons%20UX%20Copy%20/Intro_to_App_copy_with_change_notes.png)

![Nona and Mark hiking guide.jpg](Camino%20Pilgrim%20App%20%E2%80%94%20Onboarding%20+%20Buttons%20UX%20Copy%20/Nona_and_Mark_hiking_guide.jpg)