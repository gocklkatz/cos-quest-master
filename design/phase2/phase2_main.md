# ObjectScript Quest Master — Phase 2 Specification

> **Purpose**: This document defines Phase 2 extensions to the Quest Master app. Phase 1 delivered the full core loop (editor → IRIS execute → Claude evaluate → XP). Phase 2 deepens the content, improves the developer experience, and lays groundwork for future features.

---

## What Phase 1 Established

| Capability | Status |
|---|---|
| Monaco editor with ObjectScript syntax | ✅ |
| IRIS execution via XECUTE endpoint | ✅ |
| Claude-powered quest generation + evaluation | ✅ |
| XP / leveling / skill tree | ✅ |
| Quest log, XP animations | ✅ |
| localStorage persistence | ✅ |
| Fallback mode (no Claude API key) | ✅ |

**Core constraints inherited from Phase 1:**
- All code runs on a real local IRIS instance — no simulation
- Browser-only app; no dedicated backend server
- XECUTE execution model: code runs as raw ObjectScript commands, not inside class methods

---

## Carry-overs from Phase 1

*(Phase 1 defined no individually numbered features — it shipped the core loop as a single monolithic deliverable. There are no feature-doc carry-overs into Phase 2.)*

---

## Phase 2 Priority Tiers

| Priority | Theme |
|---|---|
| **P1 — High value, low complexity** | Class-based quests, AI pair programmer mode, documentation links in hints |
| **P2 — High value, medium complexity** | Multi-file project quests, concept glossary |

---

## Features

| # | Feature | Priority | Status | Doc |
|---|---|---|---|---|
| 1 | Class-Based Quest Track | phase2-high | ✅ Complete | [feature-01-class-quest-track.md](feature-01-class-quest-track.md) |
| 2 | AI Pair Programmer Mode | phase2-high | ✅ Complete | [feature-02-ai-pair-programmer.md](feature-02-ai-pair-programmer.md) |
| 3 | Documentation Links in Hints Panel | phase2-high | ✅ Complete | [feature-03-doc-links-hints.md](feature-03-doc-links-hints.md) |
| 4 | Challenge Mode (Less Pre-Filled Code) | phase2-high | ✅ Complete | [feature-04-challenge-mode.md](feature-04-challenge-mode.md) |
| 5 | Concept Glossary & Documentation Links | phase2-mid | ✅ Complete | [feature-05-concept-glossary.md](feature-05-concept-glossary.md) |
| 6 | Unified File-Tab Quest Interface | phase2-mid | ✅ Complete | [feature-06-unified-file-tabs.md](feature-06-unified-file-tabs.md) |
| 7 | Achievement System | phase2-mid | ✅ Complete | [feature-07-achievement-system.md](feature-07-achievement-system.md) |
| 8 | Resizable Panes | phase2-mid | ✅ Complete | [feature-08-resizable-panes.md](feature-08-resizable-panes.md) |

---

## Phase 2 Refactorings & Decommissions

*(No components were decommissioned in Phase 2. The Glossary feature (F5) introduced here is later removed in Phase 3 — see [Phase 3 — change-01-remove-glossary.md](../phase3/change-01-remove-glossary.md).)*

---

## Feature Dependency Graph

Arrows mean "depends on" (the target must be complete before the source is meaningful to ship).

```
F1 (Class Quest Track) ◄─────────── F6 (Unified File Tabs)
                                          ▲
F2 (AI Pair Programmer) ◄─── F8 (Resizable Panes)
                                          │
F3 (Doc Links in Hints) ◄─── F5 (Concept Glossary)

F4 (Challenge Mode) ─────────────────────┘  (soft: multi-file compat via F6)

F7 (Achievement System) — no hard dependencies
```

**Key**: Soft dependency (dashed) = F4 works without F6 for single-file quests; full multi-file challenge mode requires F6.

---

## Architecture Overview (Phase 2)

> **Legend**: `[P1]` = Phase 2 high priority (complete or current), `[P2]` = Phase 2 medium priority, `[backlog]` = deferred.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Browser (Angular App)                          │
│                                                                     │
│  QuestPanel    │  CodeEditor (file tabs) │                          │
│  AIPairChat[P1]│  OutputPanel            │                          │
│  GlossaryTab[P2]                         │                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Services                                                    │   │
│  │  GameState  QuestEngine  ClaudeAPI  IRISApi  AIPair[P1]     │   │
│  │  Glossary[P2]  Achievement[P2]                               │   │
│  │  History[backlog]  StreamingExec[backlog]                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────┬──────────────────────────────┬──────────────────────────────┘
        │                              │
        ▼                              ▼
  api.anthropic.com            localhost:52773 (IRIS)
                               ├── /api/quest/execute       (existing)
                               ├── /api/quest/compile       (existing)
                               ├── /api/quest/health        (existing)
                               ├── /api/atelier/...         (existing)
```

---

## Updated File Structure (Phase 2 additions only)

> **Label key**: `(phase2-high)` = P1 priority, `(phase2-mid)` = P2 priority, `(backlog)` = deferred.

```
quest-master/
├── src/app/
│   ├── components/
│   │   ├── ai-pair-chat/            # NEW (phase2-high)
│   │   ├── glossary/                # NEW (phase2-mid)
│   │   └── achievement-overlay/     # NEW (phase2-mid)
│   ├── services/
│   │   ├── ai-pair.service.ts          # NEW (phase2-high)
│   │   ├── glossary.service.ts         # NEW (phase2-mid)
│   │   ├── achievement.service.ts      # NEW (phase2-mid)
│   ├── models/
│   │   └── achievement.models.ts    # NEW (phase2-mid)
│   └── data/
│       └── glossary.ts              # NEW (phase2-mid)

---

## Development Sequence (Phase 2)

| # | Feature | Priority | Status |
|---|---|---|---|
| 1 | **Class-based quest infrastructure** — Atelier compile flow, compile error rendering | phase2-high | ✅ Complete |
| 2 | **AI Pair Programmer** — chat panel wired to Claude with quest context | phase2-high | ✅ Complete |
| 3 | **Documentation links in hints** — `docLinks` field, badge UI in quest panel, starter quest data | phase2-high | ✅ Complete |
| 4 | **Challenge Mode** — `starterCodeHint` field, `challengeMode` GameState flag, toolbar toggle + restore button, starter quest hints | phase2-high | ✅ Complete |
| 5 | **Concept glossary** — starter data, quest-linked popover, sidebar tab | phase2-mid | ✅ Complete |
| 6 | **Resizable panes** — drag dividers for sidebar, editor/output, output/chat | phase2-mid | ✅ Complete |
| 7 | **Unified file-tab quest interface** — replace snippet/class modes with `files[]`, single Run + Submit | phase2-mid | ✅ Complete |
| 8 | **Achievement system** — unlock logic, overlay animation, starter achievements | phase2-mid | ✅ Complete |


---

## Design Decisions

See [DECISIONS.md](DECISIONS.md).


---

## Phase Navigation

- Previous: [Phase 1 — Specification](../phase1/phase1_main.md)
- Next: [Phase 3 — Pedagogical Optimisation](../phase3/phase3_main.md)
