# Phase 2 — Architecture Decision Log

Each entry records a significant fork in the road: what was decided, why, and what was rejected. Ordered chronologically.

---

## D1 — Unified file-tabs over snippet/class mode toggle

**Decision**: Replace the `mode: 'snippet' | 'class' | 'project'` toggle with a `files: QuestFile[]` array on every quest. The editor always shows file tabs; there is no mode switch.

**Rationale**: The two-pane model forced players to write class code in one pane, compile it, then switch to a snippet pane to write calling code and run again. That context-switch friction interrupts the learning loop. A single `files[]` model is also simpler to extend (multi-file capstone quests become a natural add-on, not a special case).

**Rejected**: Keeping the mode toggle and adding a third "project" mode. This would have created three parallel code paths in `ClassQuestService` and three different editor UIs — a maintenance burden with no user benefit over the unified model.

**Affects**: [Feature 1](feature-01-class-quest-track.md), [Feature 6](feature-06-unified-file-tabs.md)

---

## D2 — Rolling 12-message window for AI Pair context

**Decision**: `AIPairService` caps conversation history at 12 messages (6 user/assistant pairs). Oldest pair is dropped first. Quest context is always injected fresh via the system prompt, not stored in history.

**Rationale**: Unbounded history would silently grow API costs for user-supplied keys and risk exceeding the Claude context window mid-session. 12 messages covers typical "stuck → hint → clarification → hint" loops without feeling artificially short. Injecting quest context via system prompt (not history) ensures it is never pruned away.

**Rejected**: Letting the full history grow until a Claude API error occurs, then trimming retroactively. This would cause unpredictable failures and confuse players.

**Affects**: [Feature 2](feature-02-ai-pair-programmer.md)

---

## D3 — Doc links as lightweight precursor to full glossary

**Decision**: Ship `docLinks?: { label, url }[]` on the Quest model (Feature 3) as a fast, zero-friction path to docs, before building the full in-app glossary (Feature 5).

**Rationale**: The glossary requires a `~60-entry` data file, a sidebar tab, a popover component, and full-text search. Doc links require one model field and four lines of HTML. Both solve the "player needs a reference" problem; the doc link version ships in an hour, the glossary in a week. Doing doc links first validates that players actually click through before investing in the richer UI.

**Rejected**: Skipping doc links and shipping only the full glossary. Risk: glossary scope creep delays Phase 2 content features.

**Affects**: [Feature 3](feature-03-doc-links-hints.md), [Feature 5](feature-05-concept-glossary.md)

---

## D4 — Challenge Mode is a global preference, not per-quest

**Decision**: `challengeMode` is stored in `GameState` as a single boolean. It applies to all quests. Toggling mid-quest does not reset the current editor content — the flag only takes effect when a new quest loads.

**Rationale**: Per-quest challenge flags would require per-quest UI to toggle them, and would need to be stored in the quest data model or in a separate map. The global flag is simpler and matches how players think: "I want to practice without scaffolding" is a learning preference, not a per-puzzle setting. The escape hatch ("Show starter code") handles cases where a specific quest proves too hard.

**Rejected**: Per-quest challenge flags. Adds complexity to the Quest model and UI without meaningful benefit over the global toggle + escape hatch combination.

**Affects**: [Feature 4](feature-04-challenge-mode.md), [Feature 6](feature-06-unified-file-tabs.md)

---

## D5 — Achievement system ships without a leaderboard

**Decision**: The Phase 2 achievement system is fully local — unlocks, XP bonuses, and history are stored in localStorage. The opt-in leaderboard (weekly resets, shared rankings) is deferred to the backlog because it requires a shared backend.

**Rationale**: Achievements provide immediate motivational value without any server infrastructure. The leaderboard adds social value but introduces auth, privacy, and backend maintenance concerns that are out of scope for a browser-only app. Separating the two lets achievements ship now.

**Rejected**: Waiting for the leaderboard backend before shipping achievements. Delays a locally valuable feature for a globally uncertain one.

**Affects**: [Feature 7](feature-07-achievement-system.md)

---

## D6 — Class namespace cleanup via DELETE on quest switch, not a background job

**Decision**: `ClassQuestService` deletes the previously compiled class via `DELETE /api/atelier/v1/USER/doc/{name}.cls` when the player switches to a new class quest. No scheduled cleanup or background process.

**Rationale**: A background job would require polling or a session-end hook — neither is natural in a browser-only app. The on-switch delete is synchronous and predictable. The "Clean up my classes" Settings button handles any classes that slipped through (e.g. app closed before switch).

**Rejected**: Accumulating all compiled classes until a manual cleanup button is pressed. The USER namespace gets cluttered and could interfere with unrelated IRIS work on the same instance.

**Affects**: [Feature 1](feature-01-class-quest-track.md)
