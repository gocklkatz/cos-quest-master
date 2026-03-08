# Feature 1: Class-Based Quest Track

| Field | Value |
|---|---|
| Priority | phase2-high |
| Status | ✅ Complete |
| Depends On | — |

---

## Task Prompt

Implement class-based quest support using the Atelier API. Key files: `class-quest.service.ts`, `quest.models.ts`, `starter-quests.ts`. Acceptance: player can write a full `.cls` file, compile it, and run a test harness against it.

---

## Design

**The problem**: Phase 1 XECUTE quests can only teach imperative code snippets. ObjectScript's most important paradigm — defining classes, methods, and properties — requires compiling actual `.cls` files into IRIS. This is the largest gap in Phase 1 content.

**The solution**: Use the Atelier API (already proxied at `/api/atelier`) to save and compile full class definitions. Add a new `ClassQuestService` that:

1. Sends the player's full class source to `PUT /api/atelier/v1/USER/doc/{ClassName}.cls`
2. Compiles it via `POST /api/atelier/v1/USER/action/compile`
3. Executes a test harness via `POST /api/quest/execute` (e.g., `WRITE ##class(MyClass).MyMethod()`)
4. Returns combined compile errors + execution output for evaluation

**Class cleanup**: Compiled classes persist in the USER namespace until the player loads a different class quest. On quest switch, `ClassQuestService` issues `DELETE /api/atelier/v1/USER/doc/{previousClassName}.cls` before compiling the new class. This keeps the namespace tidy without a separate cleanup endpoint. Classes persist within a session so players can re-run test harnesses without re-compiling. A manual **"Clean up my classes"** button in Settings can call the delete endpoint for any classes matching a `Guild.*` or `QM.Player.*` prefix.

**New skill branches unlocked:**

```
classes-extended/
  ├── Persistent classes (properties, indices, %Save, %OpenId)
  ├── Inheritance and overriding methods
  ├── Class parameters
  └── %JSON.Adaptor and serialization

 oop-patterns/
  ├── Abstract classes and interfaces (%RegisteredObject vs %Persistent)
  ├── Callbacks and triggers
  └── Class queries
```

> **Note on mode**: The `mode: 'snippet' | 'class' | 'project'` toggle from the initial class implementation is superseded by the unified file-tab model introduced in [Feature 6](feature-06-unified-file-tabs.md). The editor no longer shows a snippet/class toggle; instead, quests define their files explicitly, and the editor always shows file tabs. See Feature 6 for the full model.

---

## Implementation

**Quest model fields** (all quests — snippet and class alike — use this shape; see [Feature 6](feature-06-unified-file-tabs.md) for the unified file-tab UI):
```typescript
interface Quest {
  // ... existing fields ...
  testHarness?: string;   // ObjectScript snippet run after all files compile; used for evaluation
}
```

**Compile error response schema:**

The Atelier API `POST /api/atelier/v1/USER/action/compile` returns:
```json
{
  "status": { "errors": [] },
  "result": {
    "content": [
      {
        "name": "MyClass.cls",
        "status": [
          { "severity": 3, "text": "ERROR #5659: ...", "line": 12, "col": 4 }
        ]
      }
    ]
  }
}
```
`severity 3` = error, `severity 1` = warning. `ClassQuestService` maps this into:
```typescript
interface CompileResult {
  hasErrors: boolean;
  errors: { line: number; col: number; text: string; severity: number }[];
  output: string;  // from the execute call if compile succeeded; empty string otherwise
}
```
Compile errors are passed to the UI renderer (red markers) and to the Claude evaluation prompt separately from runtime output.

**Files changed:**
- `quest-master/src/app/models/quest.models.ts` — added `testHarness?` field
- `quest-master/src/app/services/class-quest.service.ts` — new service implementing Atelier compile flow
- `quest-master/src/app/data/starter-quests.ts` — new class-based quests for `classes-extended/` and `oop-patterns/` branches

---

## Open Questions

- [ ] Should compile errors be shown as Monaco inline red markers, or only in the output panel? (Monaco markers require decorations API wiring that may conflict with the existing snippet editor setup.)
- [ ] What prefix convention should be enforced for player-created classes to avoid collisions with existing USER namespace content? (`Guild.*` and `QM.Player.*` are proposed — are these sufficient?)
- [ ] Should the "Clean up my classes" Settings button be scoped to known prefixes only, or should it list all classes in USER and let the player pick?
