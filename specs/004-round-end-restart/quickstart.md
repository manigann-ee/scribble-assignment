# Quickstart: Round End & Restart

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## Prerequisites

- Node.js 24.13 (per `.nvmrc`)
- npm 9+
- FG1–FG3 features implemented (room creation, game start, drawing, guessing, scoring)

## Running the App

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Testing

### Manual E2E verification

Open two browser tabs at `http://localhost:5173`:

1. **Tab A** (Host): Create room, start game
2. **Tab B** (Guesser): Join room
3. **Tab A**: Click "End Round" during active gameplay
   - **Both tabs**: Transition to result/reveal screen showing the secret word, scores, and guess history
4. **Verify**: Both tabs show identical data on the result screen
5. **Tab A**: Click "Play Again"
   - **Both tabs**: Return to lobby with player list preserved
6. **Verify**: No stale round data visible (no word, no strokes, no guesses, no scores)
7. **Tab A**: Click "Start Game" → new round begins normally

### Auto-end verification

1. With multiple guessers, have each submit the correct word
2. After the last guesser submits correctly, verify all players auto-transition to result screen

### Host-only guards

1. **Tab B** (non-host): Verify "Play Again" and "End Round" buttons are not shown or are disabled
2. **Tab A** (host): Rapidly click "Play Again" multiple times → only one restart occurs

## Project Map

```
specs/004-round-end-restart/
├── plan.md              # Implementation plan
├── research.md          # Architecture decisions
├── data-model.md        # Data model definitions
├── quickstart.md        # This file
├── contracts/           # API contracts
│   └── api.md
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown
```
