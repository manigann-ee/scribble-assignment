# Quickstart: Room Setup & Lobby

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

1. **Tab A**: Click "Create Room", enter a name, click "Create and Continue"
   - Expected: Redirected to Lobby with room code displayed
2. **Tab B**: Click "Join Room", enter the code from Tab A, enter a name
   - Expected: Tab B lands in Lobby. Tab A auto-updates within ~3s showing both participants
3. **Tab A**: Start Game button is enabled. Click it.
   - Expected: Both tabs navigate to GamePage
4. **Tab B**: Start Game button should be disabled/hidden

## Project Map

```
specs/001-room-setup-lobby/
├── plan.md           # Implementation plan
├── research.md        # Architecture decisions
├── data-model.md      # Data model definitions
├── quickstart.md      # This file
├── contracts/         # API contracts
│   └── api.md
├── spec.md            # Feature specification
└── tasks.md           # Task breakdown (created by /speckit.tasks)
```
