# CLAUDE.md — Camino Pilgrim App (AG)
# Global + Project Rules (Token-efficient, high quality)

## 0) Token efficiency rule (never reduce quality)
- Be token-efficient in method (small targeted file reads, minimal diffs, avoid re-reading entire files).
- Do NOT diminish quality: never skip verification, testing, or safety checks to save tokens.

## 1) Canonical sources (single source of truth)
- Project constitution (rules + phases): https://www.notion.so/16a102c9a4af43cc93121eb1f6a802e3
- UX spec: https://www.notion.so/09527ce481d64be78746464af4a765af
- Install/onboarding prompt: https://www.notion.so/c4be919997654ebeaad0ba80ec763294
- FIXER_AGENT spec: https://www.notion.so/e11d7bda06ea4c919a1b71a66e0a1721

## 2) Global hard rules (always on)
- One Project Folder per URL. No cross-project edits.
- Data First: establish source of truth + constraints before UI.
- Coordinator mode: use parallel roles (Researcher / Architect / Implementer / Verifier).
- Verification gates before/after changes. Nothing is “done” until verified.
- Push-and-confirm: only complete when pushed to GitHub and the deployment is verified.
- Tool discipline: keep only the MCP/tools needed for the current phase active.

## 3) Camino project rules
- North Star: zero-friction pilgrimage app with real-time logistics + personalization.
- BLAST phases:
  0) Initialization (task plan / findings / progress logs)
  1) Blueprint (logic + constraints)
  2) Links/Handshake (MCP + env verification)
  3) Architecture/MVP build
  4) Stylization (cinematic layer)
  5) Trigger/Deployment (Vercel + verification)

## 4) Adversarial CodeX review (pessimistic developer)
- Default assumption: broken until proven.
- Reproduce-then-fix.
- Reversible migrations for any DB schema changes.

## 5) Self-healing + loop-breaker
- If a task fails twice, stop and summarize:
  - what failed,
  - what will be different next attempt,
  - the smallest next step.
- If context gets heavy, produce a Transfer Summary and start a fresh session.

## 6) Completion checklist
- Build/test/lint pass.
- Fix verified in browser.
- Commit pushed.
- Deployment verified live.
