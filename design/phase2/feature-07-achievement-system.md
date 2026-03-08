# Feature 7: Achievement System

| Field | Value |
|---|---|
| Priority | phase2-mid |
| Status | ✅ Complete |
| Depends On | — |

---

## Task Prompt

Implement a fully local achievement system. Key files: `achievement.models.ts`, `achievement.service.ts`, `achievement-overlay/` component, `app.ts`. Acceptance: achievements unlock after quest completion/XP gain; unlock animation overlays the XP animation; all starter achievements in the table below trigger correctly.

---

## Design

**Note**: The leaderboard component (opt-in ranking, weekly resets) depends on a shared backend and is deferred to the backlog. The achievement system is fully local and can be shipped independently.

---

## Implementation

**Achievement type:**

```typescript
interface Achievement {
  id: string;
  name: string;           // e.g. "First Blood"
  description: string;   // e.g. "Complete your first quest"
  icon: string;           // emoji or asset path
  condition: (state: GameState) => boolean;
  xpBonus: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```

**Starter achievements:**

| ID | Name | Condition | Rarity |
|---|---|---|---|
| `first-quest` | Anvil Forged | Complete Quest Zero | Common |
| `perfect-score` | Flawless | Score 100 on any quest | Rare |
| `speed-run` | The Flash | Submit within 60s of starting a quest | Rare |
| `no-hints` | Unaided | Complete 5 quests without revealing any hints | Epic |
| `all-branches` | Polymath | Complete at least one quest in every branch | Epic |
| `capstone` | Guild Master | Complete the Capstone Project | Legendary |
| `streak-7` | Week Warrior | Complete at least one quest for 7 days in a row | Rare |

**Trigger**: `AchievementService.check(state)` called after every quest completion and XP gain. Unlock animation overlays the XP animation.

**Files changed:**
- `quest-master/src/app/models/achievement.models.ts` — new: `Achievement` interface, `AchievementRarity` type
- `quest-master/src/app/models/game-state.models.ts` — added `unlockedAchievements: string[]` and `noHintsStreak: number`
- `quest-master/src/app/services/game-state.service.ts` — added `unlockAchievement()`, `updateNoHintsStreak()`, `unlockedAchievements` computed, `snapshot` computed
- `quest-master/src/app/services/achievement.service.ts` — new: `ACHIEVEMENTS` array and `AchievementService.check()` with all 7 starter conditions
- `quest-master/src/app/components/achievement-overlay/achievement-overlay.component.ts` — new overlay component
- `quest-master/src/app/components/achievement-overlay/achievement-overlay.component.html` — new overlay template
- `quest-master/src/app/components/achievement-overlay/achievement-overlay.component.scss` — new overlay styles with rarity colour variants
- `quest-master/src/app/components/quest-panel/quest-panel.component.ts` — added `hintRevealed` output, emitted from `revealHint()`
- `quest-master/src/app/app.ts` — inject `AchievementService`; track `questStartedAt` and `hintsShownForCurrentQuest`; call `check()` post-completion; queue overlay display
- `quest-master/src/app/app.html` — wire `(hintRevealed)` on quest-panel; add `<app-achievement-overlay>`

---

## Open Questions

- ~~[ ] Where are unlocked achievements persisted — inside the existing `GameState` object (and thus the same localStorage key) or a separate `qm.achievements` key?~~ **Inside `GameState`** (`unlockedAchievements: string[]`, `noHintsStreak: number`), serialised under the existing `questmaster` localStorage key.
- ~~[ ] Should the XP bonus from an achievement be retroactively awarded if the player already met the condition before this feature shipped?~~ **No** — bonuses are only awarded at the moment of unlock.
- ~~[ ] Should locked achievements be visible to the player (showing name + requirement) or hidden until unlocked?~~ **Out of scope for now** — only the unlock notification overlay is shipped. A full achievements panel is backlog.
- ~~[ ] Should the unlock animation block user input or run non-blocking in the corner?~~ **Non-blocking** — slides up from the bottom-right corner (z-index 1100, above the XP overlay), auto-dismisses after 3.5 s. Multiple unlocks queue with 4 s gaps.
