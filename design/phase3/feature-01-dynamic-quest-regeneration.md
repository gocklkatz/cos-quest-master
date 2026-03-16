# Feature 01: Dynamic Quest Regeneration (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ✅ Complete |
| Pedagogical Principle | Varied Practice |
| Depends On | [Change 01 — Remove Glossary](change-01-remove-glossary.md) |

---

## Task Prompt
After "Reset All Progress," keep `quest-zero` ("Forge the Anvil") as the only static first quest. Immediately trigger background generation of the next AI quest so it is ready the moment the player completes `quest-zero`.

---

## Pedagogical Design
**The Learning Problem**: Rote memorization. Students often "memorize the path" rather than "learning the concept" when they repeat the same quests after a reset.
**The Cognitive Solution**: Varied Practice (Schmidt). Fresh AI-generated quests force the user to apply logic rather than recall previous answers. Only the connection-verification quest (`quest-zero`) is exempt, since it tests infrastructure, not knowledge.

---

## Implementation Details
- **Frontend**:
    - `GameStateService.resetProgress()` already resets state and clears `questBank`. No changes needed there.
    - In `SettingsModal`, after calling `resetProgress()`, immediately call `QuestEngineService.generateNextQuest('setup', apiKey)` as a fire-and-forget background task (no `await`, no loading spinner).
    - `quest-zero` ("Forge the Anvil") stays in `STARTER_QUESTS` and is displayed instantly after reset — it is the only remaining static quest.
    - All quests after `quest-zero` are AI-generated and served from `questBank`.
- **IRIS Backend**: —
- **AI Prompts**: When `completedQuests` is empty or contains only `quest-zero`, the generation prompt must emphasise `apprentice` tier / Level 1 concepts.

---

## Files Changed

- `quest-master/src/app/data/starter-quests.ts` — removed all static quests except `quest-zero`
- `quest-master/src/app/services/claude-api.service.ts` — added early-stage guidance to `generateQuest` prompt (apprentice emphasis + `quest-zero` prerequisite)
- `quest-master/src/app/components/settings-modal/settings-modal.component.ts` — injected `QuestEngineService`; `doReset()` fires `generateNextQuest('setup', apiKey)` without await
- `quest-master/src/app/components/settings-modal/settings-modal.component.spec.ts` — new unit tests verifying fire-and-forget call and guard on empty API key
- `quest-master/src/app/services/quest-engine.service.ts` — `generateNextQuest` auto-advances `currentQuestId` when current quest is already completed (race-condition recovery)
- `quest-master/src/app/app.ts` — added `lastLoadedQuestId` guard, constructor effect watching `currentQuest()` for async changes, `onReset()` handler that reloads quest-zero code after reset
- `quest-master/src/app/app.html` — added `(reset)="onReset()"` binding on `<app-settings-modal>`

---

## Verification Plan
1. Press "Reset All Progress" in settings.
2. Verify "Forge the Anvil" is shown immediately with no loading delay.
3. Complete `quest-zero`.
4. Verify the next quest is already available (pre-generated in the background) — no spinner visible.
5. Verify the next quest is AI-generated and not a hard-coded entry from `STARTER_QUESTS`.
6. Confirm XP resets to 0 and level resets to 1.

---

## Back-links

- Phase: [Phase 3 Main](phase3_main.md)
- Decisions: [DECISIONS.md](DECISIONS.md) — see entries tagged with this feature's ID
