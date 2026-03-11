# Phase 3 — Architecture Decisions

### 2026-03-11: F2 — Follow-up question placed in ReviewModal, not QuestPanel
**Context**: The F2 spec said to render the follow-up question in `QuestPanel` below the feedback block. However, F10 (AI Review Modal) — implemented first — intercepts every evaluation result in a blocking modal. By the time the modal is dismissed the next quest has already loaded, so a QuestPanel follow-up question would appear too late or be overwritten.
**Decision**: Render the `followUpQuestion` and free-text reflection input inside `ReviewModalComponent`, where the user is already paused reading feedback. The Enter key handler is guarded so Enter inside the textarea does not accidentally dismiss the modal.
**Rejected alternatives**: Keeping it in QuestPanel — timing is wrong post-F10; a second modal — unnecessary complexity.

---


### 2026-03-11: F9 — Loading indicator scope and retry strategy

**Context**: F9 required decisions on (1) how much of the quest card to replace during generation, (2) the thematic copy, (3) which service holds the signals, and (4) how a "Try again" retry button in `QuestPanel` can re-invoke `generateNextQuest()` without re-passing `branch`/`apiKey`.

**Decision**:
- **Partial replacement (Option A)**: only the quest header/narrative/objective/hints/bonus sections are replaced by the shimmer skeleton; the quest list at the bottom stays visible throughout.
- **Thematic label**: *"The anvil is hot…"*
- **Service**: signals live on `QuestEngineService` (the spec incorrectly named it `QuestService`).
- **Retry pattern**: `QuestEngineService` caches `_lastBranch` and `_lastApiKey` at the start of every `generateNextQuest()` call and exposes a `retryGenerate()` method that re-uses those values. `QuestPanel` calls `retryGenerate()` with no arguments.
- **Signal access in `QuestPanel`**: inject `QuestEngineService` directly (rather than threading signals down as inputs), consistent with the decision to keep generation state encapsulated in the service.

**Rejected alternatives**:
- *Full card replacement*: simpler but causes a layout jump and loses the quest list context, increasing disorientation.
- *Output event for retry*: emitting from `QuestPanel` up to `AppComponent` adds indirection with no benefit once the service is already injected.
- *Inject `GameStateService` into `QuestPanel` for apiKey*: couples the component to a second service for a single edge case.
