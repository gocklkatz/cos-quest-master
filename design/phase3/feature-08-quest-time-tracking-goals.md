# Feature 08: Quest Time Tracking & Goals (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
| Pedagogical Principle | Spaced Repetition / Habit Formation |
| Depends On | — |

---

## Task Prompt
Track active time spent on quests and implement daily/weekly goal settings that are integrated with the achievement system.

---

## Pedagogical Design
**The Learning Problem**: Cramming vs. Learning. Many students try to finish all quests in one sitting, leading to poor long-term retention.
**The Cognitive Solution**: Spaced Repetition and Habit Formation. By rewarding *consistent effort over time* rather than just *quest completion*, we encourage "little and often" practice which is superior for long-term memory.

---

## Implementation Details
- **Frontend**:
    - New `TimeTrackingService` to measure focus time.
    - Update `SettingsModal` to allow setting "Goal: X mins/day."
    - Update `AchievementService` to track "Consistency" badges (e.g., 3-day streak).
- **IRIS Backend**: —
- **AI Prompts**: —

---

## Verification Plan
1. Set a daily goal of 5 minutes.
2. Work on quests for 5 minutes.
3. Verify an achievement notification or "Goal Met" indicator appears.
4. Check that time spent persists across browser refreshes.
