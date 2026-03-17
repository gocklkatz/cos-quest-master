# Change 05: Branch Architecture Redesign (Phase 4)

| Field | Value |
|---|---|
| Phase | Phase 4 |
| Priority | phase4-mid |
| Status | ⬜ Not started |
| Depends On | — |
| Pedagogical Principle | Cognitive Load Reduction / Deliberate Practice |

---

## Task Prompt

Redesign the flat branch progression system to introduce **sub-branches** for the Classes and SQL parent branches. The current 5-quest `classes` branch and 3-quest `sql` branch are insufficient for meaningful skill acquisition in OOP and relational query concepts. This change expands the curriculum from ~21 quests to ~41 quests minimum, provides each sub-topic with a focused arc, and defines the `subBranch` string identifiers that F6 (Code Prediction Quests), F18 (Adaptive Difficulty), and F19 (Enhanced Gamification) depend on.

**Acceptance criteria:**
1. `BRANCH_PROGRESSION` in `branch-progression.ts` is expanded to include `classes-properties`, `classes-methods`, `classes-inheritance`, `classes-relationships`, `sql-queries`, `sql-joins`, `sql-aggregation`, and `sql-embedded` in place of the flat `classes` and `sql` entries.
2. `BRANCH_DISPLAY_NAMES` is updated with human-readable labels for all new sub-branch IDs.
3. A new `BRANCH_TOPIC_DESCRIPTIONS` map provides Claude-facing topic descriptions for each sub-branch.
4. `claude-api.service.ts` branch detection (`isClassBranch`, `isSqlBranch`) is updated to use prefix matching.
5. `game-state.service.ts` migrates existing saved state: `currentBranch: 'classes'` → `classes-properties`, `currentBranch: 'sql'` → `sql-queries`.
6. `ng build` and `ng test` produce zero errors/regressions.
7. Existing game sessions gracefully handle orphaned `questBank` quests with `branch: 'classes'` or `branch: 'sql'` (treated as always-visible but not counted toward sub-branch advancement).

**Bridge fix (implement immediately, before the full sub-branch implementation):**
Raise `minQuestsToAdvance` for `classes` from 5 → 8 and `sql` from 3 → 6 in the current flat `BRANCH_PROGRESSION`. This provides more depth while the full sub-branch redesign is being implemented. The bridge fix is a one-line change and should be committed separately as a quick win.

---

## Rationale

**The Learning Problem**: The Classes branch covers Properties, Methods, Inheritance, and Relationships — four cognitively distinct sub-domains. Grouping them under a single 5-quest branch means each sub-topic gets ~1 quest, which is insufficient for chunking and retention. The same applies to SQL: Queries, Joins, Aggregation, and Embedded SQL each require dedicated practice time. Players are advancing through `classes` before they understand `%Extends`, and through `sql` before they've seen a JOIN.

**The Design Solution**: Sub-branches turn each major sub-topic into its own focused arc with a clear beginning, middle, and climactic Boss Quest (per D-P4-06). Each sub-branch is visible in the progression — the player knows they are "in Classes: Methods" rather than just "in Classes" — which sharpens goal gradient and provides more frequent completion rewards.

---

## Curriculum Specification

### Sub-branch definitions

Each sub-branch receives a `topicFocus` string (used in the Claude prompt) and a `minQuestsToAdvance` value. The final quest of each sub-branch is the Boss Quest (generated with `isBossQuest: true` by F19 — see Boss Quest integration note below).

#### Classes sub-branches (replaces flat `classes`, 5 → 16 quests minimum)

| Sub-branch ID | Display Name | `minQuestsToAdvance` | Topic focus for Claude |
|---|---|---|---|
| `classes-properties` | Classes: Properties | 4 | Class definitions, `%Persistent` vs `%RegisteredObject`, property declarations, data types, instance vs class-level (`%%`) properties, `%New()`, basic `%Save()` |
| `classes-methods` | Classes: Methods | 4 | Instance methods vs class methods (`##class` / `%%`), parameter passing, return values, `%Open()`, method chaining, `%Save()` / `%Delete()` lifecycle |
| `classes-inheritance` | Classes: Inheritance | 4 | `%Extends`, method overriding, `%Super` calls, property inheritance, abstract superclasses, polymorphism |
| `classes-relationships` | Classes: Relationships | 4 | `Relationship` properties, one-to-many and parent-child `%Relationship`, cascade save and delete, traversing relationships in ObjectScript |

Total classes quests (minimum): **16**

#### SQL sub-branches (replaces flat `sql`, 3 → 12 quests minimum)

| Sub-branch ID | Display Name | `minQuestsToAdvance` | Topic focus for Claude |
|---|---|---|---|
| `sql-queries` | SQL: Queries | 3 | Basic `SELECT`, `WHERE`, `ORDER BY`, `TOP`/`LIMIT`, column aliases, and introducing `&sql()` macro within ObjectScript scripts |
| `sql-joins` | SQL: Joins | 3 | `INNER JOIN`, `LEFT JOIN`, multi-table queries, table aliasing, joining `%Persistent` classes |
| `sql-aggregation` | SQL: Aggregation | 3 | `COUNT`, `SUM`, `AVG`, `MAX`, `MIN`, `GROUP BY`, `HAVING` — aggregate queries on ObjectScript-mapped tables |
| `sql-embedded` | SQL: Embedded | 3 | Dynamic SQL with `%SQL.Statement`, `%Prepare()`, `%Execute()`, `%sqlcode` / `%ROWCOUNT` error handling, cursor-based iteration |

Total SQL quests (minimum): **12**

#### Unchanged branches

| Branch ID | Display Name | `minQuestsToAdvance` | Notes |
|---|---|---|---|
| `setup` | Setup | 3 | Unchanged |
| `commands` | Commands | 5 | Unchanged |
| `globals` | Global Variables | 5 | Unchanged |
| `capstone` | Capstone | `null` (terminal) | Unchanged — `gameComplete` signal still checks `capstone-01/02/03` |

**Total curriculum minimum (full sub-branch implementation)**: 3 + 5 + 5 + 16 + 12 + 3 = **44 quests**

---

## Implementation Details

### Phase A — Bridge fix (ship first)

In `branch-progression.ts`, change:
```ts
{ branch: 'classes', minQuestsToAdvance: 5 },
{ branch: 'sql',     minQuestsToAdvance: 3 },
```
to:
```ts
{ branch: 'classes', minQuestsToAdvance: 8 },
{ branch: 'sql',     minQuestsToAdvance: 6 },
```

Commit message: `fix(progression): raise classes to 8 and sql to 6 as bridge before sub-branch redesign (C5)`

### Phase B — Full sub-branch implementation

#### `branch-progression.ts`

Replace the flat `classes` and `sql` entries with the full sub-branch array. Also add `BRANCH_TOPIC_DESCRIPTIONS` — a new exported map used by `claude-api.service.ts` to produce targeted quest generation prompts.

```ts
export const BRANCH_PROGRESSION: BranchStage[] = [
  { branch: 'setup',                  minQuestsToAdvance: 3 },
  { branch: 'commands',               minQuestsToAdvance: 5 },
  { branch: 'globals',                minQuestsToAdvance: 5 },
  { branch: 'classes-properties',     minQuestsToAdvance: 4 },
  { branch: 'classes-methods',        minQuestsToAdvance: 4 },
  { branch: 'classes-inheritance',    minQuestsToAdvance: 4 },
  { branch: 'classes-relationships',  minQuestsToAdvance: 4 },
  { branch: 'sql-queries',            minQuestsToAdvance: 3 },
  { branch: 'sql-joins',              minQuestsToAdvance: 3 },
  { branch: 'sql-aggregation',        minQuestsToAdvance: 3 },
  { branch: 'sql-embedded',           minQuestsToAdvance: 3 },
  { branch: 'capstone',               minQuestsToAdvance: null },
];

export const BRANCH_DISPLAY_NAMES: Record<string, string> = {
  setup:                  'Setup',
  commands:               'Commands',
  globals:                'Global Variables',
  'classes-properties':   'Classes: Properties',
  'classes-methods':      'Classes: Methods',
  'classes-inheritance':  'Classes: Inheritance',
  'classes-relationships':'Classes: Relationships',
  'sql-queries':          'SQL: Queries',
  'sql-joins':            'SQL: Joins',
  'sql-aggregation':      'SQL: Aggregation',
  'sql-embedded':         'SQL: Embedded',
  capstone:               'Capstone',
};

/** Claude-facing topic descriptions used in quest generation prompts. */
export const BRANCH_TOPIC_DESCRIPTIONS: Record<string, string> = {
  setup:
    'IRIS setup, namespace configuration, and writing first ObjectScript programs',
  commands:
    'ObjectScript commands: Set, Write, If/Else, For, While, Quit, Kill, ZWrite',
  globals:
    'global variables: subscripted storage, $ORDER traversal, $DATA existence checks, $KILL patterns',
  'classes-properties':
    'class definitions, property declarations, %Persistent vs %RegisteredObject, scalar data types (String, Integer, Date), instance vs class-level (%%) properties, %New() and basic %Save()',
  'classes-methods':
    'instance methods vs class methods (##class / %%), parameter passing by value and reference (.param), return values, %Open() by ID, method chaining, %Save() / %Delete() object lifecycle',
  'classes-inheritance':
    '%Extends keyword, method overriding with %Super calls, property inheritance, defining and extending abstract superclasses, runtime polymorphism',
  'classes-relationships':
    'Relationship properties, one-to-many and parent-child %Relationship declarations, cascade save and delete behaviour, traversing relationships in ObjectScript',
  'sql-queries':
    'basic SELECT queries, WHERE clauses, ORDER BY, TOP/LIMIT, column aliases, and the &sql() macro for embedding SQL inside ObjectScript scripts',
  'sql-joins':
    'SQL INNER JOIN and LEFT JOIN, multi-table queries, table aliasing, joining %Persistent class-mapped tables',
  'sql-aggregation':
    'aggregate functions COUNT, SUM, AVG, MAX, MIN, GROUP BY, HAVING — applied to ObjectScript-mapped tables',
  'sql-embedded':
    'dynamic SQL with %SQL.Statement, %Prepare(), %Execute(), %sqlcode / %ROWCOUNT error handling, cursor-based result iteration with %SQL.StatementResult',
  capstone:
    'comprehensive ObjectScript — combining globals, classes, and SQL in a single integrated solution',
};
```

#### `claude-api.service.ts`

Update the two branch-detection booleans and the system prompt to use the new maps:

```ts
// Old — exact string match
const isClassBranch = currentBranch === 'classes' || currentBranch === 'capstone';
const isSqlBranch   = currentBranch === 'sql';

// New — prefix match
const isClassBranch = currentBranch.startsWith('classes') || currentBranch === 'capstone';
const isSqlBranch   = currentBranch.startsWith('sql');
```

Import `BRANCH_TOPIC_DESCRIPTIONS` and add a topic description line to the system prompt:

```ts
import { BRANCH_TOPIC_DESCRIPTIONS } from '../data/branch-progression';

// In generateQuest() system prompt:
const topicDescription = BRANCH_TOPIC_DESCRIPTIONS[currentBranch] ?? currentBranch;

// In the system string, replace:
`Their current skill branch is: ${currentBranch}`
// with:
`Their current skill branch is: ${currentBranch} (${topicDescription})`
```

No other changes to `claude-api.service.ts` are required — the branch string passes through unchanged, and the quest's `"branch"` field in the JSON response will be the sub-branch string (e.g., `"classes-methods"`), which is already how the engine tracks quest-to-branch assignment.

#### `game-state.service.ts`

Add a `migrateState()` helper and call it in `loadFromStorage()`. This ensures players who had `currentBranch: 'classes'` or `currentBranch: 'sql'` in localStorage are forwarded to the correct sub-branch entry point without data loss.

```ts
private migrateState(state: GameState): GameState {
  const BRANCH_MIGRATIONS: Record<string, string> = {
    classes: 'classes-properties',
    sql:     'sql-queries',
  };

  const migratedBranch = BRANCH_MIGRATIONS[state.currentBranch] ?? state.currentBranch;

  const migratedUnlocked = state.unlockedBranches.map(
    b => BRANCH_MIGRATIONS[b] ?? b
  );

  return {
    ...state,
    currentBranch:    migratedBranch,
    unlockedBranches: [...new Set(migratedUnlocked)],
  };
}
```

In `loadFromStorage()`, apply the migration after merging with `DEFAULT_GAME_STATE`:

```ts
return this.migrateState({ ...DEFAULT_GAME_STATE, ...parsed });
```

**Orphaned questBank entries**: Quests in `questBank` with `branch: 'classes'` or `branch: 'sql'` are left in place. In `quest-engine.service.ts`, `availableQuests()` already handles this gracefully — `questBranchIndex === -1` (unknown branch) returns `true`, so orphaned quests remain visible. They will not count toward sub-branch `minQuestsToAdvance` thresholds (since `q.branch !== 'classes-properties'` etc.), which is acceptable: players who were mid-way through the old classes branch simply replay those topics under the new sub-branch structure. Orphaned quests do not need to be cleared.

#### `quest-engine.service.ts`

**No changes required.** `resolveBranch()` iterates `BRANCH_PROGRESSION` linearly by index — it will advance from `classes-properties` to `classes-methods` to `classes-inheritance` etc. automatically once each `minQuestsToAdvance` threshold is met. `needsQuestGeneration` and `availableQuests` also operate on the `BRANCH_PROGRESSION` array index, so they work correctly with sub-branches.

One audit note: verify that `branchUnlocked.set(targetBranch)` in `generateNextQuest()` produces sensible UI toast messages for sub-branch names (e.g., "Classes: Methods unlocked"). The toast reads from `BRANCH_DISPLAY_NAMES` — ensure that lookup is present for all sub-branch IDs (it will be, given the updated `BRANCH_DISPLAY_NAMES` above).

---

## Boss Quest integration note (F19 dependency)

Per D-P4-06, the **final quest in each sub-branch is a Boss Quest**. With `minQuestsToAdvance: 4` (classes sub-branches), the 4th quest is the Boss Quest. With `minQuestsToAdvance: 3` (SQL sub-branches), the 3rd quest is the Boss Quest.

The Boss Quest generation logic is owned by F19 (Enhanced Gamification). This change doc does **not** implement Boss Quest generation — it only establishes the sub-branch structure that F19 requires. F19 will need:
- The `completedInBranch` count from `quest-engine.service.ts` (already computed in `generateNextQuest()`)
- A `isBossQuest: boolean` parameter added to `ClaudeApiService.generateQuest()` when `completedInBranch === stage.minQuestsToAdvance - 1`

Expose the following helper in `quest-engine.service.ts` for F19 to consume:

```ts
/** True when the next generated quest in the given branch is the Boss Quest. */
isNextQuestBossQuest(branch: string): boolean {
  const stage = BRANCH_PROGRESSION.find(s => s.branch === branch);
  if (!stage || stage.minQuestsToAdvance === null) return false;
  const completedInBranch = this.allQuests().filter(
    q => q.branch === branch && this.gameState.completedQuests().includes(q.id)
  ).length;
  return completedInBranch === stage.minQuestsToAdvance - 1;
}
```

This method is **not called by anything in C5** — it is a forward-compatible hook for F19.

---

## Sub-branch topic progression design

Each sub-branch should feel like a focused tutorial arc, not a random sampling of its parent topic. The quest generation prompt passes the `topicDescription` to Claude, but this section documents the **intended learning arc** per sub-branch so the spec is unambiguous.

### Classes: Properties (`classes-properties`)
| Quest # | Expected learning focus |
|---|---|
| 1 | Defining a `%Persistent` class with 2–3 scalar properties; `%New()` + `%Save()` |
| 2 | Data type constraints (`%String` maxlen, `%Integer` minval/maxval, `%Date`) |
| 3 | Class-level (`%%`) properties and class methods that read them; private vs public |
| 4 *(Boss Quest)* | Multi-property persistent class: create, save, retrieve by ID, and print all properties |

### Classes: Methods (`classes-methods`)
| Quest # | Expected learning focus |
|---|---|
| 1 | Instance method with parameters; calling it via `%New()` and instance method invocation |
| 2 | Class method (`##class(Pkg.Name).MethodName()`) — no instantiation required |
| 3 | `%Open()` by ID; method that modifies a property and calls `%Save()` |
| 4 *(Boss Quest)* | Object lifecycle: create → save → open by ID → modify → save → delete; multiple methods cooperating |

### Classes: Inheritance (`classes-inheritance`)
| Quest # | Expected learning focus |
|---|---|
| 1 | `%Extends` — subclass inheriting properties from a superclass |
| 2 | Method override — subclass redefines a superclass method; `%Super` call to chain |
| 3 | Abstract superclass with no default method implementation; subclass required to implement |
| 4 *(Boss Quest)* | Polymorphism: array of superclass instances, each a different subclass — call overridden method on each |

### Classes: Relationships (`classes-relationships`)
| Quest # | Expected learning focus |
|---|---|
| 1 | One-to-many `Relationship` declaration; parent `%Save()` cascades to children |
| 2 | Traversing the child collection; iterating over `%List` returned by the relationship |
| 3 | Parent-child cascade delete; verifying children are removed when parent is deleted |
| 4 *(Boss Quest)* | Full parent-child object graph: create parent + children, save, open parent by ID, enumerate children, delete one child |

### SQL: Queries (`sql-queries`)
| Quest # | Expected learning focus |
|---|---|
| 1 | `&sql(SELECT ... INTO :var)` single-row retrieval; `SQLCODE` check |
| 2 | `WHERE` with string and integer conditions; `ORDER BY`; iterating with `%SQL.Statement` |
| 3 *(Boss Quest)* | Multi-column SELECT with `TOP`, column aliases, result iteration, and `SQLCODE` error handling |

### SQL: Joins (`sql-joins`)
| Quest # | Expected learning focus |
|---|---|
| 1 | `INNER JOIN` between two `%Persistent` tables |
| 2 | `LEFT JOIN` — rows returned even when right-side match is absent |
| 3 *(Boss Quest)* | Three-table join with table aliases; selecting columns from each table; interpreting NULL values from the LEFT JOIN |

### SQL: Aggregation (`sql-aggregation`)
| Quest # | Expected learning focus |
|---|---|
| 1 | `COUNT(*)` and `SUM(column)` on a single table |
| 2 | `GROUP BY` with `COUNT` per group; display grouped results |
| 3 *(Boss Quest)* | `GROUP BY` + `HAVING` to filter groups; combine `AVG`, `MAX`, `MIN` in a single query |

### SQL: Embedded (`sql-embedded`)
| Quest # | Expected learning focus |
|---|---|
| 1 | `%SQL.Statement` + `%Prepare()` + `%Execute()` — basic dynamic query |
| 2 | Cursor-style iteration with `%SQL.StatementResult:Next()`; reading column values by name |
| 3 *(Boss Quest)* | Parameterised dynamic query (`:param` substitution), full error handling (`%sqlcode`, `%Message`), and result set iteration |

---

## Files Changed

- `quest-master/src/app/data/branch-progression.ts` — replace flat `classes`/`sql` entries with 8 sub-branch entries; add `BRANCH_TOPIC_DESCRIPTIONS` export; update `BRANCH_DISPLAY_NAMES`
- `quest-master/src/app/services/claude-api.service.ts` — update `isClassBranch`/`isSqlBranch` to prefix matching; import and use `BRANCH_TOPIC_DESCRIPTIONS` in system prompt
- `quest-master/src/app/services/game-state.service.ts` — add `migrateState()` and apply in `loadFromStorage()`
- `quest-master/src/app/services/quest-engine.service.ts` — add `isNextQuestBossQuest()` forward-compatible hook (no behaviour changes)

---

## Open Questions

- [ ] **Capstone quests**: The three hard-coded capstone quests (`capstone-01/02/03`) currently reference no parent branch. Do they need a parent-branch label (e.g., `branch: 'capstone'`) added to their quest objects so they count toward capstone completion? Check `STARTER_QUESTS` data — if already set, no action needed.
- [ ] **F18 entry points**: `DifficultyService.getInitialSubBranch()` (D-P4-08) maps Intermediate → `classes-properties` and Advanced → `classes-methods` or `sql-queries`. Verify these IDs match the sub-branch strings defined here before implementing F18.
- [ ] **Tree Visualizer**: Check whether `tree-visualizer.component.ts` renders branch names from `BRANCH_DISPLAY_NAMES` or hard-codes branch strings. If hard-coded, update to use the lookup.

---

## Verification Plan

**Bridge fix**
1. Start a new game; complete 8 quests in `classes` — verify the branch advances to `sql`.
2. Complete 6 quests in `sql` — verify the branch advances to `capstone`.

**Sub-branch progression**
3. Start a new game; verify `currentBranch` initialises to `setup`.
4. Complete 3 quests in `setup` — verify `resolveBranch()` advances to `commands`.
5. Complete 5 quests in `commands` → `globals`, 5 more → `classes-properties`.
6. Complete 4 quests in `classes-properties` — verify branch advances to `classes-methods`.
7. Complete 4 quests each through `classes-methods`, `classes-inheritance`, `classes-relationships` — verify sequential progression to `sql-queries`.
8. Complete 3 quests each through all SQL sub-branches — verify advancement to `capstone`.

**State migration**
9. Manually set `localStorage.questmaster` with `"currentBranch":"classes"` and reload — verify the app migrates to `"currentBranch":"classes-properties"` in memory without a crash.
10. Repeat with `"currentBranch":"sql"` → verify migration to `"sql-queries"`.
11. Verify `unlockedBranches` migrates `"classes"` → `"classes-properties"` in localStorage after reload.

**Orphaned quests**
12. Seed a `questBank` entry with `branch: "classes"` — verify it appears in `availableQuests()` (unknown branch = always visible) and does not count toward `classes-properties` advancement.

**Claude prompt**
13. Trigger a quest generation call while on `classes-methods` — verify the system prompt contains `"classes-methods (instance methods vs class methods…)"`.
14. Trigger a generation on `sql-joins` — verify the system prompt contains `"sql-joins (SQL INNER JOIN…)"`.
15. Verify `isClassBranch` is `true` for `classes-properties`, `classes-methods`, `classes-inheritance`, `classes-relationships`, and `capstone`; `false` for `sql-queries`.
16. Verify `isSqlBranch` is `true` for all `sql-*` sub-branches; `false` for `classes-*`.

**Build**
17. `ng build` — zero errors.
18. `ng test` — zero regressions.

---

## Back-links

- Phase: [Phase 4 Main](phase4_main.md)
- Decisions: [D-P4-04 — Branch architecture](DECISIONS.md) · [D-P4-06 — Boss Quest placement](DECISIONS.md) · [D-P4-08 — Adaptive difficulty entry points](DECISIONS.md)
- Blocked by this change: [F6 — Code Prediction Quests](../phase3/feature-06-code-prediction-quests.md) · [F17 — Infinite Quest Loop](feature-17-infinite-quest-loop.md) · [F18 — Adaptive Difficulty](feature-18-adaptive-difficulty.md) · [F21 — IDE Quests](feature-21-ide-quests.md)
