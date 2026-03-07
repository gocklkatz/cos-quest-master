# Quest Master — Frontend

Angular 21 frontend for the COS Quest Master learning app. See the [root README](../README.md) for the full project overview and IRIS setup.

## Development server

```bash
npm install
ng serve
```

Open [http://localhost:4200](http://localhost:4200). The dev server proxies `/api/quest/*` and `/api/atelier/*` to `http://localhost:52773` (IRIS).

## Build

```bash
ng build        # production build → dist/
ng test         # unit tests (Vitest)
```

## Project structure

```
src/app/
├── components/
│   ├── code-editor/        # Monaco editor wrapper
│   ├── connection-indicator/
│   ├── header-bar/
│   ├── output-panel/
│   ├── quest-log/
│   ├── quest-panel/
│   ├── settings-modal/
│   ├── skill-tree/
│   └── xp-animation/
├── data/
│   ├── starter-quests.ts   # Hard-coded quest definitions
│   ├── skill-tree.ts       # Skill tree nodes and unlock rules
│   └── xp-table.ts         # Level XP thresholds
├── models/                 # TypeScript interfaces
└── services/
    ├── claude-api.service.ts
    ├── game-state.service.ts
    ├── iris-api.service.ts
    ├── iris-connection.service.ts
    └── quest-engine.service.ts
```