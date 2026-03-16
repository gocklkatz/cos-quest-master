# Feature 2: AI Pair Programmer Mode

| Field | Value |
|---|---|
| Priority | phase2-high |
| Status | ✅ Complete |
| Depends On | — |
| Pedagogical Principle | Metacognition |

---

## Task Prompt

Implement a persistent chat panel alongside the output panel that maintains a Claude conversation thread aware of the current quest context. Key files: `ai-pair.service.ts`, `ai-pair-chat/` component, `app.ts`. Acceptance: player can ask questions mid-quest and receive contextual guidance without the full solution being given away.

---

## Design

**The problem**: Players get stuck between quest attempts. The only AI interaction is quest generation (before) and evaluation (after). There's no "ask for help while coding."

**The solution**: Add a **Chat** panel alongside the output panel — a persistent Claude conversation thread that knows the current quest context.

---

## Implementation

**Services:**
- New `AIPairService` with a `conversationHistory` signal (array of `{role, content}` messages)
- System prompt includes: current quest title, objective, player's current code (from editor signal), and IRIS output from the last run
- User types questions; Claude responds with guidance, never giving away the full answer (configurable strictness)
- "Clear chat" button
- Chat history persists per quest ID in localStorage

**Example system prompt extension:**
```
You are an ObjectScript programming mentor. The player is working on this quest:

Quest: {questTitle}
Objective: {questObjective}
Concepts introduced: {concepts}

The player's current code:
{currentCode}

Last IRIS output:
{lastOutput}

Guide them toward the solution with questions and hints. Do NOT write the full solution for them
unless they explicitly ask for it. Focus on ObjectScript idioms and IRIS-specific behavior.
Keep responses concise — 3 sentences maximum unless asked for more detail.
```

**UI placement**: Collapsible chat panel below the output panel, toggled by a chat icon in the toolbar.

**Context window management:**
- `AIPairService` maintains a rolling window of at most **12 messages** (6 user/assistant pairs). When the history exceeds 12 entries, the oldest pair is dropped before sending to Claude.
- The current code and quest context are always injected fresh in the system prompt — not stored as history — so no quest context is ever silently lost when messages are pruned.
- Display a passive indicator in the chat header: `"4 / 12 messages in context"`. No hard block — visibility only.
- This also bounds per-session API cost for user-supplied Claude API keys.

**Files changed:**
- `quest-master/src/app/services/ai-pair.service.ts` — new service
- `quest-master/src/app/components/ai-pair-chat/` — new component (chat panel UI)
- `quest-master/src/app/app.ts` — wire chat panel, pass quest context to `AIPairService`

---

## Open Questions

- [ ] Should "Clear chat" wipe the localStorage-persisted history for that quest, or only clear the in-memory state (so it can be restored on reload)?
- [ ] Should the "do not give the full solution" policy be always-on, or should there be a user-configurable strictness toggle (e.g. "Hint mode" vs "Explain mode")?
- [ ] Should the chat panel be collapsed or expanded by default when a quest loads? (Expanded costs screen real estate; collapsed means players may not discover it.)
