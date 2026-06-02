# Implementation Plan: Draw, Guess & Score

**Branch**: `assignment` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-draw-guess-score/spec.md`

## Summary

Extend the active round with drawing canvas synchronization (strokes visible to all, clear canvas), guess submission pipeline (trim, validate, case-insensitive match), shared guess history, and deterministic scoring (correct = 100, incorrect = 0). All sync uses HTTP polling consistent with project constraints.

## Technical Context

**Language/Version**: TypeScript 5.6, Node 24.13

**Primary Dependencies**: Express 4.21 (backend), React 18 (frontend), Zod 3.23 (backend)

**Storage**: In-memory `Map<string, Room>` on the backend server. Stroke data and guess history stored as arrays on the Room object.

**Testing**: Vitest (backend: node env, frontend: jsdom env)

**Target Platform**: Modern browsers

**Project Type**: Web application — Express REST backend + React SPA frontend

**Performance Goals**: Strokes visible to all players within ~3s. Guess submissions reflected in history within ~2s. Canvas clear reflected within ~3s.

**Constraints**: No WebSockets — drawing sync via HTTP polling of stroke data array. No databases. No auth. No real-time push.

**Scale/Scope**: 2–6 simultaneous players, single round per game, basic stroke-based drawing (no brush size/color/shapes in this feature).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Review Discipline**: spec.md exists and was created before this plan → PASS
- **Out of Scope Enforcement**: No WebSockets (drawing sync via polling), no databases, no auth, no multiple rounds, no fancy drawing tools → PASS
- **Testing Principles**: Test strategy covers visibility (strokes appear for all), validation (guess trimming/empty rejection), multi-room isolation, scoring determinism, and restart behavior → PASS
- **Engineering Principles** (Extend, Don't Rewrite): All changes add fields to existing models and create new frontend components. No new backend files. No starter code rewritten. → PASS

## Project Structure

### Documentation (this feature)

```text
specs/003-draw-guess-score/
├── plan.md              # This file
├── research.md          # Phase 0 — architecture decisions
├── data-model.md        # Phase 1 — entity definitions
├── quickstart.md        # Phase 1 — setup instructions
├── contracts/           # Phase 1 — API contract definitions
│   └── api.md
├── spec.md              # Feature specification
└── tasks.md             # Phase 2 — task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/src/
├── models/
│   └── game.ts                     # ✎ Add Stroke, Guess types; extend Room with strokes[], guesses[], scores{}
├── services/
│   └── roomStore.ts               # ✎ Add addStroke, clearCanvas, submitGuess, getGuessHistory, getScores
├── api/
│   ├── rooms.ts                    # ✎ Add stroke, guess, scores endpoints
│   └── schemas.ts                  # ✎ Add strokeSchema, guessSchema
├── app.ts                          # No changes
└── server.ts                       # No changes

frontend/src/
├── services/
│   └── api.ts                      # ✎ Add stroke sync, guess submission, history fetch methods
├── state/
│   └── roomStore.ts                # ✎ Add canvas state, guesses, scores, polling for drawing
├── pages/
│   └── GamePage.tsx                # ✎ Major update: add canvas area, guess input, history, scoreboard
├── components/
│   ├── Canvas.tsx                   # ★ NEW drawing canvas component (draw + display modes)
│   ├── GuessInput.tsx               # ★ NEW guess text input with validation
│   ├── GuessHistory.tsx             # ★ NEW shared guess history list
│   └── Scoreboard.tsx               # ★ NEW per-player score display
└── routes/index.tsx                 # No changes
```

**Structure Decision**: Existing monorepo with `backend/` and `frontend/`. Backend changes extend existing models and store. Frontend adds new components for canvas, guessing, and scoring UI. The critical architectural design is synchronous drawing via HTTP polling — strokes are sent to the server and fetched by all clients on each poll cycle.

## Data Flow

### Drawing Sync
```
Drawer draws stroke on canvas
  → POST /rooms/:code/strokes { points, color?, width? }
  → Backend appends stroke to room.strokes[]
  → Other clients poll GET /rooms/:code → RoomSnapshot now includes strokes[]
  → Each client renders the full stroke array on their canvas
```

### Clear Canvas
```
Drawer clicks "Clear Canvas"
  → DELETE /rooms/:code/strokes
  → Backend empties room.strokes[]
  → All clients poll → receive empty strokes[] → clear canvases
```

### Guess Submission
```
Guesser types a guess, submits
  → POST /rooms/:code/guess { participantId, text }
  → Backend:
      1. Trim whitespace from text
      2. Reject if empty → 400
      3. Reject if >100 chars → 400
      4. Case-fold both guess and secretWord
      5. Exact string compare
      6. If correct and player hasn't guessed correctly before:
         award 100 points, record guess { correct: true, score: 100 }
      7. If correct but already guessed correctly:
         record guess { correct: true, score: 0 }
      8. If incorrect:
         record guess { correct: false, score: 0 }
      9. Append to room.guesses[]
  → Response: { correct: boolean, score: number }
  → All clients poll → receive updated guesses[] and scores map
```

### Guess History & Scores
```
Any player polls room state
  → GET /rooms/:code?participantId=XYZ
  → Response includes:
      room.guesses: Guess[]     // ordered history
      room.scores: { [participantId]: number }  // current scores
  → Frontend renders guess history list and scoreboard
```

## State Model

### Backend Types (`backend/src/models/game.ts`)

**Room** (extended from FG1/FG2):
```typescript
Room {
  code: string
  status: "lobby" | "playing"
  participants: Participant[]
  hostId: string
  drawerId: string | null
  secretWord: string | null
  strokes: Stroke[]              // ★ NEW — ordered stroke data
  guesses: Guess[]               // ★ NEW — ordered guess history
  scores: Record<string, number> // ★ NEW — participantId → cumulative score
  createdAt: string
  updatedAt: string
}

Stroke {
  participantId: string          // always the drawer
  points: { x: number, y: number }[]  // ★ NEW — line segments
  color: string                  // default: "#000000"
  width: number                  // default: 3
  timestamp: string
}

Guess {
  participantId: string
  displayName: string
  text: string                   // original submitted text (pre-trim, for history display)
  normalized: string             // trimmed + case-folded (for verification)
  correct: boolean
  score: number                  // 100 for first correct, 0 otherwise
  timestamp: string
}
```

**RoomSnapshot** (extended):
```typescript
RoomSnapshot {
  code: string
  status: RoomStatus
  participants: Participant[]
  hostId: string
  drawerId: string | null
  strokes: Stroke[]              // ★ NEW — always included for all viewers
  guesses: Guess[]               // ★ NEW — always included for all viewers
  scores: Record<string, number> // ★ NEW — always included for all viewers
  availableWords: string[]
  roles: string[]
}
```

### Frontend Types (`frontend/src/services/api.ts`)

```typescript
RoomSnapshot {
  // ...existing fields...
  strokes: Stroke[]
  guesses: Guess[]
  scores: Record<string, number>
}

GuessSubmission {
  participantId: string
  text: string
}

GuessResult {
  correct: boolean
  score: number
}
```

### Frontend State (`frontend/src/state/roomStore.ts`)

```typescript
RoomState {
  // ...existing fields...
  isDrawer: boolean
  secretWord: string | null
  strokes: Stroke[]
  guesses: Guess[]
  scores: Record<string, number>
  // Actions:
  addStroke(points): Promise<void>
  clearCanvas(): Promise<void>
  submitGuess(text): Promise<GuessResult>
}
```

## Complexity Tracking

> No Constitution violations detected. Changes extend existing models and add new frontend components. Drawing sync via polling follows the established pattern from FG1/FG2.

## Requirement Traceability Map

| Req. | Plan Coverage |
|------|---------------|
| FR-001 — Drawing Visibility | Data Flow (POST stroke, GET strokes via poll), State Model (strokes[] in RoomSnapshot) |
| FR-002 — Clear Canvas | Data Flow (DELETE strokes, empty strokes[] → clear render) |
| FR-003 — Guess Trimming | Data Flow (step 1: trim whitespace) |
| FR-004 — Empty Guess Rejection | Data Flow (step 2: reject if empty → 400) |
| FR-005 — Case-Insensitive Match | Data Flow (step 4: case-fold both) |
| FR-006 — Guess History | Data Flow (step 9: append to guesses[], poll includes guesses[]) |
| FR-007 — History Sync | Data Flow (all clients poll same guesses[] from server) |
| FR-008 — Scoring | Data Flow (step 6: award 100, step 7-8: 0) |
| FR-009 — Scoring Determinism | Data Flow (deterministic logic per guess) |
| FR-010 — Per-Guesser Scoring | State Model (scores: Record<string, number>) |
| FR-011 — First Correct Only | Data Flow (step 6 vs 7: check if already guessed correctly) |
| FR-012 — History Ordering | Data Flow (append chronological, poll returns ordered) |
| SC-001 | E2E validation (drawing appears on guesser screen within 3s) |
| SC-002 | E2E validation (clear canvas → blank for all within 3s) |
| SC-003 | E2E validation (correct guess → 100 pts in history within 2s) |
| SC-004 | E2E validation (incorrect guess → 0 pts in history within 2s) |
| SC-005 | E2E validation (empty guess → error, no history entry) |
| SC-006 | E2E validation (two guessers see identical history) |
| SC-007 | E2E validation (all case variants accepted as correct) |
| SC-008 | E2E validation (duplicate correct guess → 0 additional pts) |
