<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0  (initial ratification from brownfield analysis)
Modified principles: N/A — first formal constitution
Added sections: Core Principles (I–VII), Performance Standards, Development Workflow, Governance
Removed sections: N/A
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check section is present and generic; no
     principle-specific outdated references found.
  ✅ .specify/templates/spec-template.md — No constitution references; aligns with principles.
  ✅ .specify/templates/tasks-template.md — Task organization aligns with principles; no updates needed.
Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Date set to first formal analysis date (2026-03-29). Update if project
    records an earlier formal inception date.
-->

# COS Quest Master Constitution

## Core Principles

### I. Signal-First Reactivity (NON-NEGOTIABLE)

All component and service state MUST be expressed as Angular signals (`signal()`, `computed()`,
`effect()`). RxJS is permitted only for genuinely streaming or interval-based I/O (e.g., IRIS health
polling via `interval + switchMap`). No manual `markForCheck()`, `detectChanges()`, or zone triggers.
Effects MUST use `untracked()` where necessary to prevent re-entrancy loops. New state introduced by
any feature MUST live in a signal — not in a class field, BehaviorSubject, or local variable promoted
to component scope.

**Rationale**: Zoneless + signals is the deliberate architectural choice. Mixing RxJS state with
signals creates split mental models, harder debugging, and inconsistent rendering behavior in the
zoneless context.

### II. Graceful Degradation

The core learning loop — write ObjectScript → execute on IRIS → see output — MUST function without
a Claude API key. Every AI-dependent feature (quest generation, code evaluation, AI Pair chat) MUST
have a defined fallback: a simple evaluator, a canned response, or a clear "AI unavailable" UI state.
The UI MUST visually indicate reduced-mode operation (e.g., "AI evaluation unavailable" notice). No
feature MAY silently fail or leave the player in an unrecoverable state.

**Rationale**: The Anthropic API key is user-supplied and optional. Many players may run the tool
locally without a key or with exhausted credits. Learning value must survive API outages.

### III. Test Coverage Standards

**E2E tests (Playwright)** MUST cover every user journey end-to-end: quest completion, XP gain,
state persistence across reloads, error recovery (network failure, auth failure, rate limits), and
fallback mode. All Claude API and IRIS REST calls in E2E MUST be mockable; tests MUST NOT rely on
live external services unless explicitly annotated as integration tests.

**Unit tests (Vitest)** MUST cover all service business logic: GameStateService mutations, quest
generation/normalization, achievement unlock conditions, time tracking accumulation, ClassQuestService
topological sort and cleanup. New services MUST ship with unit tests. Existing test gaps (AiPairService,
TimeTrackingService idle detection, ClassQuestService, CodeEditorComponent Monaco binding) MUST be
addressed before the related service is materially changed.

**Test-first discipline**: For non-trivial logic, tests MUST be written before implementation (TDD
Red-Green). At minimum, tests MUST be written before a PR is merged.

**Rationale**: The project already has strong E2E coverage; unit test gaps are the documented
technical debt. This principle closes that gap incrementally without requiring a big-bang rewrite.

### IV. UX Consistency

All async operations expected to take >200ms MUST show a loading indicator (signal-driven: `isRunning`,
`isEvaluating`, `questGenerating`). Interactive elements MUST be disabled while their operation is
in flight. Error messages displayed to the player MUST be user-friendly: no raw stack traces, IRIS
internal class paths, or ObjectScript error codes without context. IRIS error text MUST be sanitized
and prefixed with plain-language context before display.

Animations (XP popup, achievement overlay, level-up) MUST follow the established timing conventions:
achievement cards displayed sequentially with 4s delay between each; XP animation auto-dismisses after
3s. New animated UI elements MUST match these timings or document the deviation. All interactive
elements (file tabs, quest panel hints, prediction radio buttons, settings fields) MUST carry
appropriate ARIA labels.

**Rationale**: The gamification loop depends on consistent, delightful feedback. Inconsistent loading
states or raw error messages break immersion and erode trust.

### V. Security & Data Locality

User credentials (Anthropic API key, IRIS username/password) stored in `localStorage` MUST travel
only to their intended recipients: the API key to `api.anthropic.com`, IRIS credentials to the local
IRIS instance. No credential MUST ever be logged, sent to a third party, or included in error
telemetry. The `anthropic-dangerous-direct-browser-access` header is an accepted tradeoff for the
local-only use case; any change making the app internet-facing MUST revisit this decision.

IRIS user-submitted code MUST execute in isolated temp classes (`QMTmp{jobId}`). Temp classes MUST
be deleted after execution. The `/execute` endpoint MUST enforce a timeout (currently 5s). Error
responses from IRIS MUST be reviewed before display (see Principle IV).

**Rationale**: This is a local development tool. The security posture is explicitly "local only." Any
deviation from local-only operation requires a security review and upgrade of the API key handling.

### VI. Simplicity & Minimal Dependencies

No server-side backend beyond the IRIS instance. No state management libraries (NgRx, Akita, NGXS).
New npm dependencies require explicit justification: what problem they solve, why the existing stack
cannot address it, and what the bundle impact is. The initial bundle MUST stay under the configured
1MB hard limit (enforced by angular.json budgets). Abstractions MUST be introduced only when a pattern
appears at least three times in the codebase.

localStorage remains the persistence layer. Alternatives (IndexedDB, remote sync) MUST NOT be
introduced without a documented migration plan and player data safety guarantees.

**Rationale**: The architecture's biggest strength is its simplicity — no backend, no build complexity
beyond Angular. That simplicity MUST be defended actively as features are added.

### VII. ObjectScript Execution Integrity

The `/execute` endpoint MUST wrap user code in a temp class method, not execute raw strings inline.
Multi-line code MUST be preserved as-is (current: newline-split + XECUTE). XECUTE timeouts MUST be
set before each execution and cleared after. Globals accessed during execution MUST not persist beyond
the quest unless the quest explicitly targets global persistence. The `/globals` endpoint MUST filter
system globals (`^%`, `^IRIS*`) and cap tree depth at 3 levels with a per-level child limit of 50
to prevent UI explosion.

**Rationale**: User code executes in a shared IRIS namespace. Isolation through temp classes and
time limits prevents runaway processes from affecting the learning environment.

## Performance Standards

- localStorage writes MUST be debounced at ≤100ms trailing; no more than one `persist()` call per
  event loop tick during rapid state changes.
- Angular initial bundle MUST remain ≤1MB (hard error budget enforced in `angular.json`).
- IRIS health polling interval MUST be ≥5s and ≤30s.
- Quest panel, output panel, and XP bar MUST render within one animation frame of state change
  (signals guarantee this; avoid `setTimeout(fn, 0)` workarounds in components).
- Quest bank MUST be pruned: generated quests older than 30 days of inactivity or exceeding 200
  entries MUST be evicted (oldest first) to prevent localStorage quota exhaustion.

## Development Workflow

- TypeScript `strict: true` MUST remain enabled; `noImplicitReturns`, `noFallthroughCasesInSwitch`,
  and all Angular strict template flags MUST remain on. Suppressions via `@ts-ignore` MUST include a
  comment explaining why and a linked issue.
- All PRs touching service logic MUST have passing Vitest runs.
- All PRs touching user-facing flows MUST have passing Playwright runs.
- The **Constitution Check** section of every `plan.md` MUST enumerate which principles are affected
  by the feature and confirm no violations, or document justified exceptions.
- Code reviewed for Principle VI (Simplicity): reviewers MUST flag new abstractions with fewer than
  three use sites and new dependencies without documented justification.

## Governance

This constitution supersedes all informal conventions and prior ad-hoc decisions. It is the
authoritative reference for technical decisions in COS Quest Master.

**Amendment procedure**:
- PATCH (clarifications, typos): self-approved; update `LAST_AMENDED_DATE` and bump patch version.
- MINOR (new principle, material guidance expansion): document rationale; update version.
- MAJOR (principle removal, backward-incompatible governance change): requires written justification
  in the PR description explaining the migration path for existing code that relied on the removed
  principle.

**Versioning policy**: `CONSTITUTION_VERSION` follows semantic versioning. Every amendment MUST bump
the version and update `LAST_AMENDED_DATE`.

**Compliance review**: Constitution Check gates MUST be performed at plan time and re-checked after
Phase 1 design. Violations not documented in the Complexity Tracking table of `plan.md` are blocking.

**Version**: 1.0.0 | **Ratified**: 2026-03-29 | **Last Amended**: 2026-03-29
