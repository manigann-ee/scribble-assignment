# Quickstart: Draw, Guess & Score

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

Backend runs on `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Testing

### Run all tests
```bash
cd backend && npm test
cd frontend && npm test
```

### Manual E2E verification
Open two browser tabs at `http://localhost:5173`:

1. **Tab A** (Host): Create room → lobby appears with room code
2. **Tab B** (Guesser): Join room with Tab A's code → both see each other in lobby
3. **Tab A**: Click "Start Game" → both tabs navigate to GamePage
4. **Tab A (drawer)**: Draw on the canvas with mouse/pen
   - **Tab B (guesser)**: Sees the same drawing appear (within ~3s)
5. **Tab A**: Click "Clear Canvas"
   - **Both tabs**: Canvas clears (within ~3s)
6. **Tab B**: Type a guess and submit
   - If correct (matches secret word): Guess recorded as correct with 100 points in history
   - If incorrect: Guess recorded with 0 points
7. **Tab B**: Submit an empty or whitespace-only guess → error displayed, no history entry
8. **Tab B**: Submit the correct word with different casing (e.g., "ROCKET") → recorded as correct
9. **Both tabs**: Verify guess history shows the same entries and scores in the same order

## Project Map

```
specs/003-draw-guess-score/
├── plan.md              # Implementation plan
├── research.md          # Architecture decisions
├── data-model.md        # Data model definitions
├── quickstart.md        # This file
├── contracts/           # API contracts
│   └── api.md
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown
```
