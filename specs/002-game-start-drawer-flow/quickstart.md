# Quickstart: Game Start & Drawer Flow

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## Prerequisites

- Node.js 24.13 (per `.nvmrc`)
- npm 9+

## Running the App

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:3001`. Confirm with:
```bash
curl http://localhost:3001/health
# → {"ok":true}
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. To point at a different backend:
```bash
VITE_API_URL=http://localhost:3001 npm run dev
```

## Testing

### Run all tests
```bash
cd backend && npm test
cd frontend && npm test
```

### Manual E2E verification
Open two browser tabs at `http://localhost:5173`:

1. **Tab A**: Create room → lobby appears
2. **Tab B**: Join room with Tab A's code → both see each other in lobby
3. **Tab A**: Enter an empty/whitespace-only name as a player (via Join in a third tab), then click "Start Game"
   - Expected: Error "All players must have a name", stays in lobby
4. **Tab A**: Ensure all players have non-empty names, click "Start Game"
   - Expected: Both tabs navigate to GamePage
5. **Tab A (drawer)**: Sees "You are the drawer" badge and secret word (e.g., "Draw this: rocket")
6. **Tab B (guesser)**: Sees game screen with NO secret word visible

## Project Map

```
specs/002-game-start-drawer-flow/
├── plan.md              # Implementation plan
├── research.md          # Architecture decisions
├── data-model.md        # Data model definitions
├── quickstart.md        # This file
├── contracts/           # API contracts
│   └── api.md
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown
```
