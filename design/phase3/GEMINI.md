# Gemini CLI — Phase 3 Design Folder Instructions

This file defines the workflow and standards for **Gemini CLI** when executing the **Phase 3: Pedagogical Optimization** phase.

---

## Workspace Structure

| File | Role |
|---|---|
| `phase3_main.md` | Master specification, priority tiers, and pedagogical rationale. |
| `feature-NN-*.md` | Detailed design and task prompts for specific Phase 3 features. |
| `DECISIONS.md` | Log of architectural choices and pedagogical tradeoffs. |
| `GEMINI.md` | This file — foundational instructions for Gemini CLI. |

---

## Implementation Workflow

### 1. Research & Strategy
- **Contextual Awareness**: Before implementing any feature, read `phase3_main.md` and the specific `feature-NN-*.md`.
- **Dependency Check**: Verify that all Phase 1 and Phase 2 prerequisites are functional.
- **Pedagogical Alignment**: Ensure the implementation adheres to the specific cognitive science principle (e.g., Dual Coding, Metacognition) defined in the feature doc.

### 2. Execution (Surgical Updates)
- **Status Updates**: Maintain status in both the feature doc and `phase3_main.md` using:
  - `⬜ Not started`
  - `🚧 In progress`
  - `✅ Complete`
- **Documentation**: If a new IRIS endpoint is added (e.g., for the Global Visualizer), update the **IRIS REST API Reference** in the root `README.md`.
- **Testing**: Every Phase 3 feature MUST include a verification step and a corresponding **automated test** (Unit or E2E). For UI features, use Playwright or Vitest. For services, use Vitest.

### 3. Validation
- **Behavioral Correctness**: Does the feature solve the pedagogical problem?
- **Structural Integrity**: Does it follow the Angular 21 (Signals/Standalone) and ObjectScript conventions of the project?
- **Build & Test**: Upon completion of any feature, you MUST:
  1. Run the Angular production build (`ng build`) to ensure no compilation errors.
  2. Run all project tests (`ng test` or `npm test`) to ensure no regressions.

---

## Creating New Feature Docs

When drafting a new Phase 3 feature, use this template:

```markdown
# Feature NN: [Title] (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high / phase3-mid / phase3-low |
| Status | ⬜ Not started |
| Pedagogical Principle | [e.g. Dual Coding / Metacognition] |
| Depends On | [Feature IDs] |

---

## Task Prompt
[Concise description of what to implement and acceptance criteria.]

---

## Pedagogical Design
**The Learning Problem**: [Why is this hard for students?]
**The Cognitive Solution**: [How does this feature help?]

---

## Implementation Details
- **Frontend**: [Components/Services to create/modify]
- **IRIS Backend**: [New methods in QuestMaster.REST.Execute]
- **AI Prompts**: [Changes to ClaudeApiService]

---

## Verification Plan
1. [Step 1]
2. [Step 2]
```

---

## Conventions & Style
- **Naming**: Use `feature-NN-kebab-case.md` for feature docs.
- **Brevity**: Keep feature docs focused on the *why* and the *how*.
- **Consistency**: Adhere to the established "no-backend" (Browser + IRIS) architecture.
