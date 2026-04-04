# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Manager (V0.1)** is a personal task management desktop application that enforces the GTD-like methodology from the book *小强升职记* (Small Strong Rises in Rank). The core value proposition is *forcing structured thinking*, not just recording tasks.

> System value = forcing you to think, not helping you record

## Planned Tech Stack

- **Frontend:** Electron (desktop app)
- **Storage:** SQLite or JSON (local only, no backend)
- **No server-side dependency**

The project is currently in the **PRD/planning phase** — `prd.md` is the sole source of truth. No source code exists yet.

## Architecture

The system is built around **5 modules** and 1 core engine:

```
Inbox → Decision Panel (engine) → Next Actions / Projects / Waiting
```

**Decision Panel (判定面板)** is the core engine — every task from Inbox must pass through a mandatory 5-step decision flow before being routed:

1. **Do it?** → Discard / Reference / Someday / Yes
2. **2-minute rule?** → Do now / No
3. **Who does it?** → Self / Delegate → Waiting
4. **Fixed time?** → Scheduled / No
5. **Is it a project?** → Projects / Next Actions

**System rules (enforced at the UI level):**
- All tasks must enter Inbox first — no direct routing
- Every Inbox task must be processed through the Decision Panel exactly once
- Next Actions must start with a verb, be executable, and have a clear result
- Tasks cannot return to Inbox once processed

**Four-quadrant prioritization** is simplified to two tags (重要 / 紧急) with auto-sort: Important+Urgent → Important-only → Others.

## MVP Layout

```
Left panel:  Inbox | Next Actions | Projects | Waiting
Right panel: Task detail + Decision Panel flow
```

Core interaction:
```
New task → auto-enters Inbox
Click task → forces Decision flow
Decision complete → auto-routes to correct list
```

## AI Upgrade Roadmap (future phases)

1. **Phase 1:** AI assists decision (classify project vs action, suggest next actions)
2. **Phase 2:** AI drafts sub-task breakdowns, plans, delegation messages
3. **Phase 3:** AI executes autonomously (send messages, track delegated tasks, generate reports)
