# Research: Draw, Guess & Score

**Phase**: 0 — Outline & Research | **Date**: 2026-06-02

## Unknowns Resolved

No NEEDS CLARIFICATION markers were present in the Technical Context. All decisions derive from the existing project architecture (TypeScript, Express, React, in-memory storage, HTTP polling).

## Architecture Decisions

### Drawing Sync via Polling

- **Decision**: Stroke data is stored as an ordered array on the Room object. Drawers POST individual strokes. All clients poll GET /rooms/:code and receive the full strokes array. Each client renders all strokes on an HTML Canvas element.
- **Rationale**: The project forbids WebSockets. Polling is the established pattern (FG1 lobby, FG2 word delivery). Strokes are small text payloads (arrays of {x,y} points). For the target scale (2-6 players, single round), polling at ~2s intervals for stroke data is acceptable. Stroke rendering is idempotent — clients re-render the full array on each poll.
- **Alternatives considered**: WebSockets (forbidden by constitution), SSE (forbidden), canvas-as-image upload (too much data per poll, not incremental), stroke compression (premature optimization for 2-6 players).

### Stroke Data Representation

- **Decision**: Each stroke is an object with `participantId`, `points: {x,y}[]`, `color: string`, `width: number`, `timestamp: string`. Points are recorded as the user drags the mouse/pen. Mousedown starts a new stroke, mousemove appends points, mouseup finalizes.
- **Rationale**: Simple, human-readable, sufficient for basic line drawing. The spec (Out of Scope) excludes brush size, colors, and shapes — so a single default color and width are sufficient.
- **Alternatives considered**: SVG path data (over-engineered for lines only), binary encoding (premature), per-pixel data (way too large).

### Guess Validation Pipeline

- **Decision**: A linear pipeline on the backend: trim → check empty → check length → case-fold both guess and secret → exact string compare → check previous correct → record.
- **Rationale**: Matches VR-01 through VR-07 exactly. Single-responsibility steps make testing straightforward. Case folding uses JavaScript's `.toLowerCase()` which handles Unicode case folding for the target word set (English words).
- **Alternatives considered**: Regex matching (not needed for exact match), fuzzy matching (out of scope — A-004), server-side NLP (way over-engineered for 5 starter words).

### Scoring Model

- **Decision**: Scores tracked as `Record<participantId, number>` on the Room. Incremented by 100 on each first-correct guess per player. Frontend displays from the snapshot. No score history — only running total.
- **Rationale**: Simple integer map. No persistence needed (in-memory). FR-011 (first correct only) is enforced by tracking a `Set<participantId>` of players who have already guessed correctly in the current round.
- **Alternatives considered**: Score history (unnecessary — running total suffices for display), points deduction for incorrect guesses (not in spec), tiered scoring (not in spec).

### Drawing Storage Approach

- **Decision**: Strokes stored in-memory on the Room object. On clear canvas, the array is emptied. No pagination or limits (2-6 players, single round, ~20-50 strokes max).
- **Rationale**: In-memory storage matches the project constraint. Stroke count is bounded by round duration and player count. If a round produces hundreds of strokes, the polling payload grows but remains manageable (each stroke is ~100-500 bytes of JSON).
- **Alternatives considered**: Separate stroke store (unnecessary indirection), file storage (out of scope — no databases), indexed in a different data structure (premature optimization).

## Dependency Checks

| Dependency | Status | Notes |
|------------|--------|-------|
| Express 4.21 | Already present | No changes needed |
| React 18 + react-router-dom 6 | Already present | No changes needed |
| Vitest | Already present | Both frontend and backend configs exist |
| TypeScript 5.6 | Already present | Both tsconfigs |
| None needed | No new dependencies required | Canvas API is native to browsers; no drawing library needed |
