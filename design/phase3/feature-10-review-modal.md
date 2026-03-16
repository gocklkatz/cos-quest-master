# Feature 10: AI Review Modal (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ✅ Complete |
| Depends On | [F1 — Dynamic Quest Regeneration](feature-01-dynamic-quest-regeneration.md) |
| Pedagogical Principle | Elaborative Feedback / Metacognition |

---

## Task Prompt

When a player submits a quest, the AI evaluation result (feedback text, code review, XP earned, bonus objectives) is currently shown inline in the `QuestPanel` sidebar. If the quest is passed, the next quest loads immediately and the review content is replaced before the player finishes reading it.

**Change**: Show the evaluation result in a blocking modal dialog immediately after evaluation completes. The next quest must not load until the player explicitly dismisses the modal by clicking **OK** or pressing **Enter**.

Acceptance criteria:
- Modal appears for every submission result (pass and fail).
- Modal contains: pass/fail indicator, feedback text, code review block (if present), XP earned (if passed), bonus objectives (if any).
- Modal has a single **OK** button that dismisses it.
- Pressing **Enter** dismisses the modal (same as clicking OK).
- Next quest does not load until after the modal is dismissed.
- Clicking the backdrop also dismisses the modal.
- Modal is styled consistently with the existing `SettingsModal` (dark theme, `#1e1b2e` background, purple accent).

---

## Pedagogical Design

**The Learning Problem**: The AI evaluation gives specific, actionable feedback (code review, rationale for pass/fail, improvement suggestions). If the player does not read this feedback, the learning loop is broken — they move on without understanding *why* they passed or what could be improved.

**The Cognitive Solution**: A modal forces a deliberate pause. The player must consciously confirm they are done reading before advancing. This is a minimal "desirable difficulty" — it does not block progress, but it prevents accidental skipping of high-value feedback. Combined with F2 (AI Elaborative Interrogation), the review text will eventually include a follow-up question, making the pause even more pedagogically valuable.

---

## Implementation Details

- **New component**: `ReviewModalComponent` (`review-modal/review-modal.component.{ts,html,scss}`).
  - `input`: `evaluation: EvaluationResult` (required)
  - `output`: `confirmed: void`
  - Listens for `document:keydown.enter` via `@HostListener` to emit `confirmed`.
  - Backdrop click also emits `confirmed`.
  - `autofocus` on the OK button ensures Enter works immediately without an extra click.

- **`app.ts` changes**:
  - Add `reviewEvaluation = signal<EvaluationResult | null>(null)`.
  - Add `private pendingNextQuest: (() => void) | null = null`.
  - In `submitCode()`, after evaluation: always set `reviewEvaluation` to show the modal. For a passed quest, capture the next-quest loading logic in `pendingNextQuest` instead of executing it immediately.
  - Add `onReviewConfirmed()`: clears `reviewEvaluation`, then calls and clears `pendingNextQuest`.

- **`app.html` changes**:
  - Add `@if (reviewEvaluation()) { <app-review-modal ... /> }` alongside the existing `app-settings-modal` block.

- **`QuestPanel` sidebar**: The inline `evaluation-section` block can remain as-is (it still shows the last result for the current quest while the player is working on it after a failed attempt). The modal and the sidebar serve different moments: the modal fires immediately post-submit; the sidebar shows the persistent result while coding.

---

## Files Changed

- `src/app/components/review-modal/review-modal.component.ts` — new component
- `src/app/components/review-modal/review-modal.component.html` — modal template
- `src/app/components/review-modal/review-modal.component.scss` — styles
- `src/app/app.ts` — add signal, pending-quest logic, `onReviewConfirmed()`, import component
- `src/app/app.html` — render modal conditionally

---

## Open Questions

- ~~Should the modal also appear for failed quests (where the next quest does NOT load)?~~ **Yes** — confirmed by Verification Plan step 1; modal appears for pass and fail, consistent UX.
- ~~Should the modal include a "Try Again" shortcut button (for failed quests) in addition to OK?~~ **Deferred to Phase 4** — keep minimal; OK button is sufficient for now.

---

## Verification Plan

1. Submit a quest that fails — modal appears with failure indicator and feedback text; clicking OK or pressing Enter closes it; the quest does not change.
2. Submit a quest that passes — modal appears with pass indicator, XP, and feedback; next quest does NOT load until OK is confirmed.
3. Submit a quest with a code review returned by Claude — code review block is visible in the modal.
4. Press Enter immediately after modal appears (without clicking) — modal dismisses.
5. Click the backdrop — modal dismisses.
6. Run `ng build` with zero errors.

---

## Back-links

- Phase: [Phase 3 Main](phase3_main.md)
- Decisions: [DECISIONS.md](DECISIONS.md) — see entries tagged with this feature's ID
