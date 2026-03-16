# Feature 16 — Victory Screen

**Priority**: phase3-high
**Status**: ✅ Implemented

## Goal

After the player completes all three capstone quests (`capstone-01`, `capstone-02`, `capstone-03`), the game reaches its natural end. Previously nothing happened — the quest list went silent and the player was left with no indication that they had finished. This feature closes that loop with a proper win condition.

---

## Trigger Condition

The victory screen fires **once**, immediately after the review modal for `capstone-03` is dismissed (`onReviewConfirmed()`), when `QuestEngineService.gameComplete()` is `true`.

`gameComplete` is a computed signal that returns `true` iff all three capstone quest IDs (`capstone-01`, `capstone-02`, `capstone-03`) appear in `completedQuests`.

---

## Visual Design

A full-screen fixed overlay (z-index 1200, above everything) that appears on top of the normal game UI.

**Background**: A `<canvas>` element stretched to fill the overlay, running a continuous particle-based fireworks animation. Fireworks launch from random x positions along the bottom half, explode at random heights in the upper half, and scatter coloured sparks that fade and drift under simulated gravity.

**Centre card** (glassmorphism box, centred in the viewport):

```
╔══════════════════════════════════╗
║       ★  YOU WON!  ★             ║
║                                  ║
║  The Eternal Archive is sealed.  ║
║  Your mastery is complete.       ║
║                                  ║
║   Rank:  Grand Master            ║
║   Level: 15                      ║
║   XP:    4 820                   ║
║                                  ║
║        [ Continue ]              ║
╚══════════════════════════════════╝
```

- Title: large, gold gradient, subtle glow pulse animation.
- Rank label is derived from the player's level at the moment of victory (see rank table below).
- "Continue" button dismisses the overlay (no page reload; the player can still browse completed quests).

---

## Rank Table

| Level  | Rank Title       |
|--------|------------------|
| 1–2    | Novice           |
| 3–5    | Apprentice       |
| 6–8    | Journeyman       |
| 9–11   | Adept            |
| 12–13  | Expert           |
| 14     | Master           |
| 15     | Grand Master     |

---

## Fireworks Algorithm (Canvas 2D)

Each frame:
1. Fade the canvas with a semi-transparent black fill (trail effect).
2. On a random interval (~every 45–90 frames), launch a new **rocket** particle upward from a random x near the bottom.
3. When a rocket reaches its apex (random y in the top 55 % of the canvas), replace it with an **explosion**: 60–90 spark particles scattered in all directions with random velocities and a random HSL colour.
4. Each spark has: position, velocity (vx, vy), gravity (constant downward), lifespan counter, colour.
5. Draw each spark as a small filled circle; reduce opacity as lifespan decays. Remove dead sparks.
6. Loop via `requestAnimationFrame`; cancel on dismiss via `cancelAnimationFrame`.

---

## Component API

**Selector**: `app-victory-overlay`
**File**: `src/app/components/victory-overlay/`

**Inputs**:
| Name         | Type     | Description                              |
|--------------|----------|------------------------------------------|
| `trigger`    | `number` | Increment to show the overlay (0 = noop) |
| `playerName` | `string` | Player's name from game state            |
| `level`      | `number` | Player's level at time of victory        |
| `xp`         | `number` | Player's total XP at time of victory     |

**Outputs**:
| Name        | Description                         |
|-------------|-------------------------------------|
| `dismissed` | Emitted when player clicks Continue |

---

## Integration Points

- **`QuestEngineService`**: `readonly gameComplete = computed(...)` — true when all three capstone IDs are in `completedQuests`.
- **`QuestViewComponent`**:
  - `victoryTrigger`, `victoryLevel`, `victoryXp` signals.
  - `onReviewConfirmed()` checks `questEngine.gameComplete()` → sets trigger and snapshots level/xp.
  - `<app-victory-overlay>` at the bottom of `quest-view.component.html`.

---

## Accessibility

- Overlay is `role="dialog"` with `aria-modal="true"` and `aria-label="Victory"`.
- Continue button uses `autofocus` so keyboard users can dismiss immediately.
- Fireworks canvas is `aria-hidden="true"` (decorative).
- No auto-dismiss timer — player decides when to close.
