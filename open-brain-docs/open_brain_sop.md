# Open Brain SOP: Screen Activity Capture → Agent Training Data

**Version:** 1.0
**Created:** 2026-03-29
**Owner:** Nona Tobin
**System:** Open Brain (Supabase + pgvector)

---

## Purpose

This SOP defines how to capture screen activity (clicks, workflows, decision-making) and transform those recordings into structured training data that feeds Open Brain's agent skill development pipeline. Every recording becomes a reusable asset — teaching agents how you work so they can replicate, assist, or automate those workflows.

---

## 1. Recording Screen Activity

### 1.1 Choose Your Tool

| Tool | Best For | Setup |
|------|----------|-------|
| **OBS Studio** (Free, Open Source) | Long sessions, multi-monitor, full control | [obsproject.com](https://obsproject.com) |
| **Loom** (Freemium) | Quick walkthroughs, instant sharing, auto-transcription | [loom.com](https://www.loom.com) |

> **Decision:** Select one tool and use it consistently. OBS is recommended for detailed workflow captures (longer sessions, local file control). Loom is recommended for quick narrated walkthroughs that benefit from built-in transcription.

### 1.2 OBS Studio Setup

1. **Install OBS** from [obsproject.com](https://obsproject.com)
2. **Configure a Scene** named `Open Brain Capture`:
   - **Source 1:** Display Capture (full screen) or Window Capture (specific app)
   - **Source 2:** Audio Input Capture (microphone — for narration)
   - **Source 3 (optional):** Audio Output Capture (system audio)
3. **Output Settings:**
   - Format: `.mp4`
   - Encoder: x264 or NVENC (if GPU available)
   - Resolution: 1920×1080 (match your display)
   - Frame rate: 30 fps (sufficient for workflow capture)
   - Quality: CRF 18–23 (balance between quality and file size)
4. **Enable mouse click visualization:**
   - Windows: Use [PointerFocus](https://www.pointerfocus.com/) or [Mouse Highlighter (PowerToys)](https://learn.microsoft.com/en-us/windows/powertoys/mouse-utilities)
   - Mac: Use [Cursor Pro](https://www.yelallsoft.com/cursorpro/) or [Mouseposé](https://boinx.com/mousepose/)
   - These tools highlight clicks and cursor movement so agents can track interaction points
5. **Hotkeys (recommended):**
   - Start Recording: `Ctrl+Shift+R`
   - Stop Recording: `Ctrl+Shift+S`
   - Pause: `Ctrl+Shift+P`

### 1.3 Loom Setup

1. **Install Loom** desktop app from [loom.com](https://www.loom.com)
2. **Recording settings:**
   - Screen + Camera (or Screen Only for pure workflow capture)
   - HD quality (1080p)
   - Enable mouse click effects (Settings → Recording → Show Click Effects)
   - Enable system audio if capturing app sounds
3. **After recording:**
   - Loom auto-generates a transcript — download it as `.srt` or `.txt`
   - Download the `.mp4` file from the Loom dashboard for local storage
   - Save transcript alongside the video using the same naming convention (see Section 2)

### 1.4 Recording Best Practices

- **Narrate as you go.** Speak your reasoning aloud: "I'm clicking here because…" — this creates the richest training signal for agents.
- **One task per recording.** Keep sessions focused. A 5-minute focused capture is more valuable than a 60-minute rambling session.
- **Pause, don't stop.** If you get interrupted, pause the recording rather than starting a new one.
- **Capture the full workflow.** Start from the trigger (email, notification, idea) and end at the deliverable (document saved, message sent, task completed).
- **Show your mistakes.** Don't restart on errors — agent training benefits from seeing how you recover.

---

## 2. File Naming Convention

### Format

```
YYYY-MM-DD_task-description.mp4
```

### Rules

| Rule | Example |
|------|---------|
| Date in ISO format | `2026-03-29` |
| Underscore between date and description | `2026-03-29_` |
| Lowercase, hyphens for spaces | `filing-motion-to-compel` |
| Keep description short (3–6 words) | `notion-database-setup` |
| No special characters except hyphens | No `&`, `#`, `(`, `)` |
| Always `.mp4` extension | Not `.mov`, `.avi`, `.mkv` |

### Examples

```
2026-03-29_notion-database-setup.mp4
2026-03-30_obs-scene-configuration.mp4
2026-04-01_hoa-document-review.mp4
2026-04-02_camino-route-planning.mp4
2026-04-03_ai-grandma-nona-voice-test.mp4
```

### Companion Files

When transcripts or notes exist, use the same base name:

```
2026-03-29_notion-database-setup.mp4          ← video
2026-03-29_notion-database-setup.srt          ← transcript (from Loom or Whisper)
2026-03-29_notion-database-setup_notes.md     ← manual notes / annotations
```

---

## 3. Storage Location

### Google Drive Structure

```
Google Drive/
└── Open Brain/
    └── Screen Recordings/
        ├── _index.md                  ← master log (optional, Notion is primary)
        ├── Camino/
        ├── HOA/
        ├── AI-Grandma-Nona/
        ├── Open-Brain/
        ├── Litigation/
        └── General/
```

### Setup Steps

1. In Google Drive, create the folder: **Open Brain → Screen Recordings**
2. Create subfolders for each active project (see Section 4 for project tags)
3. Set OBS default recording path to a local sync folder:
   - If using Google Drive for Desktop: `G:\My Drive\Open Brain\Screen Recordings\`
   - If uploading manually: save locally first, then drag into the correct project subfolder
4. For Loom: download `.mp4` from Loom dashboard → upload to the appropriate project subfolder

### Backup Rule

Every recording must exist in **two places**:
1. Google Drive (primary, cloud)
2. Local machine or external drive (backup)

---

## 4. Project Tagging

### Active Project Tags

| Tag | Description | Drive Subfolder |
|-----|-------------|-----------------|
| `Camino` | Camino Pilgrim App development | `/Camino/` |
| `HOA` | HOA litigation, SCA board work, community advocacy | `/HOA/` |
| `AI-Grandma-Nona` | AI Grandma Nona voice agent and persona | `/AI-Grandma-Nona/` |
| `Open-Brain` | Open Brain system development and maintenance | `/Open-Brain/` |
| `Litigation` | Legal filings, evidence review, document prep | `/Litigation/` |
| `NBLM` | NotebookLM notebook management and research | `/NBLM/` |
| `Skills` | Perplexity / Claude skill creation and testing | `/Skills/` |
| `General` | Anything that doesn't fit above | `/General/` |

### Tagging Rules

- Every recording gets **exactly one primary tag** (the project it most directly supports).
- If a recording spans two projects, tag it with the primary one and note the secondary in the Notion database `Notes` field.
- New project tags can be added — update this table and create the corresponding Drive subfolder.
- Tags are used in both the Drive folder structure and the Notion database (see Section 5).

---

## 5. Notion Database Schema: Screen Recording Log

### Database Name

**Open Brain — Screen Recordings**

### Properties

| Property | Type | Description |
|----------|------|-------------|
| **Name** | Title | Brief description of the task captured (same as filename task-description) |
| **Date** | Date | Recording date (YYYY-MM-DD) |
| **Project Tag** | Select | One of: `Camino`, `HOA`, `AI-Grandma-Nona`, `Open-Brain`, `Litigation`, `NBLM`, `Skills`, `General` |
| **File Link** | URL | Google Drive sharing link to the `.mp4` file |
| **Status** | Select | One of: `Raw`, `Reviewed`, `Trained` |
| **Duration** | Text | Approximate length (e.g., "5:32") |
| **Tool Used** | Select | `OBS` or `Loom` |
| **Has Transcript** | Checkbox | Whether a transcript file exists |
| **Notes** | Text | Freeform notes — secondary project tags, key moments, agent-relevant observations |

### Status Definitions

| Status | Meaning |
|--------|---------|
| **Raw** | Recorded but not yet reviewed. Default for all new entries. |
| **Reviewed** | Watched back, notes added, transcript verified. Ready for agent training. |
| **Trained** | Content has been extracted and fed into Open Brain (as memory, skill, or workflow). |

### Workflow

1. **Record** → file saved to Drive → log entry created in Notion (status: `Raw`)
2. **Review** → watch recording, add notes, verify transcript → update status to `Reviewed`
3. **Train** → extract actions/decisions into Open Brain memories or skill definitions → update status to `Trained`

---

## 6. How Agents Use These Recordings

### The Training Pipeline

```
Screen Recording (.mp4)
        │
        ▼
┌─────────────────────────┐
│  TRANSCRIPTION           │
│  Whisper / Loom auto     │
│  → timestamped text      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  ACTION EXTRACTION       │
│  AI parses transcript    │
│  → structured steps      │
│  → decision points       │
│  → tool sequences        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  OPEN BRAIN INGESTION    │
│  Memories table:         │
│  type = "workflow"       │
│  topics = [project tag]  │
│  action_items = [steps]  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  SKILL SYNTHESIS         │
│  Patterns across         │
│  multiple recordings     │
│  → reusable agent skills │
└─────────────────────────┘
```

### Step-by-Step: Recording → Agent Knowledge

**Step 1 — Transcribe**
Run the recording through a transcription service to get timestamped text:
- **Loom:** Auto-generates transcript — download as `.srt`
- **OBS recordings:** Use OpenAI Whisper (local or API), or upload to a transcription service
- Save transcript with the same naming convention as the video

**Step 2 — Extract Actions**
Feed the transcript to an AI agent (Claude, GPT, Perplexity) with this prompt template:

```
You are analyzing a screen recording transcript to extract agent training data.

Transcript:
[paste transcript]

Extract:
1. TASK: What was the user trying to accomplish?
2. STEPS: Numbered list of actions taken (click, type, navigate, decide)
3. TOOLS USED: Which applications/websites were used?
4. DECISION POINTS: Where did the user make a choice? What was chosen and why?
5. PATTERNS: Any repeatable workflows that could be automated?
6. ERRORS & RECOVERY: Any mistakes made and how they were fixed?

Format as structured JSON.
```

**Step 3 — Ingest into Open Brain**
Store the extracted data as an Open Brain memory:

```sql
INSERT INTO memories (content, type, topics, action_items, source)
VALUES (
  'Workflow: [task description]. Steps: [extracted steps]. Tools: [tools]. Decisions: [decision points].',
  'workflow',
  ARRAY['[project-tag]', '[tool-name]'],
  ARRAY['[action item 1]', '[action item 2]'],
  'screen_recording'
);
```

Or use the MCP ingest endpoint:
```
POST /functions/v1/ingest-memory
{
  "content": "...",
  "type": "workflow",
  "topics": ["camino", "notion"],
  "action_items": ["..."],
  "source": "screen_recording"
}
```

**Step 4 — Synthesize Skills**
After multiple recordings of similar workflows accumulate:
1. Query Open Brain for all `type = 'workflow'` memories with a shared topic
2. Identify common patterns, repeated sequences, and decision trees
3. Compile into a structured skill definition (Perplexity skill `.md` or Claude Project instruction)
4. The skill becomes a reusable, teachable behavior any agent can execute

### What Agents Learn From Recordings

| Signal | What It Teaches |
|--------|-----------------|
| **Click sequences** | UI navigation patterns, preferred tools |
| **Narrated reasoning** | Decision-making logic, priority heuristics |
| **Error recovery** | Fault tolerance, alternative approaches |
| **Tool switching** | Integration patterns, data flow between apps |
| **File management** | Naming conventions, organization preferences |
| **Communication style** | Tone, formatting, audience adaptation |

### Example: From Recording to Skill

**Recording:** `2026-04-01_hoa-document-review.mp4`

**Extracted workflow:**
1. Open Google Drive → HOA folder
2. Download new document
3. Open in Adobe Acrobat → OCR scan
4. Search for key terms (assessment, violation, due process)
5. Highlight relevant sections
6. Copy highlights to Notion evidence log
7. Tag by case number and relevance level

**Resulting agent skill:**
> "When given an HOA document, OCR it, search for legal terms, extract relevant passages, and log them to the Notion evidence database with case number and relevance tags."

---

## 7. Quick Reference Checklist

### Before Recording
- [ ] OBS/Loom open and configured
- [ ] Mouse click visualization enabled
- [ ] Microphone on (for narration)
- [ ] Close sensitive/irrelevant windows
- [ ] Know what task you're about to capture

### During Recording
- [ ] Narrate your reasoning aloud
- [ ] One focused task per recording
- [ ] Pause (don't stop) for interruptions
- [ ] Show the full workflow start-to-finish

### After Recording
- [ ] Rename file: `YYYY-MM-DD_task-description.mp4`
- [ ] Move to correct Google Drive subfolder
- [ ] Download/generate transcript if available
- [ ] Create entry in Notion database (status: `Raw`)
- [ ] Verify backup exists (local + cloud)

### Weekly Review
- [ ] Review all `Raw` recordings from the past week
- [ ] Add notes, verify transcripts → update to `Reviewed`
- [ ] Extract training data from `Reviewed` recordings → update to `Trained`
- [ ] Check for patterns across recordings that suggest new skills

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-29 | Initial SOP created |
