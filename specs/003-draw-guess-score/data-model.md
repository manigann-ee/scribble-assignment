# Data Model: Draw, Guess & Score

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## Entities

### Room

The core game session. Extended from FG1/FG2 with drawing state, guess history, and scoring.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | 4-char uppercase alphanumeric (excludes I,O,0,1). Unique key. |
| `status` | `RoomStatus` | Yes | Current phase: `"lobby"` or `"playing"`. |
| `participants` | `Participant[]` | Yes | Ordered by join time. At least 1 at all times. |
| `hostId` | `string` | Yes | Participant ID of the room host. Set at creation. |
| `drawerId` | `string \| null` | Yes | Participant ID assigned as drawer for the current round. |
| `secretWord` | `string \| null` | Yes | The word selected for the current round. |
| `strokes` | `Stroke[]` | Yes | ★ NEW — Ordered drawing stroke data. Empty array in lobby. |
| `guesses` | `Guess[]` | Yes | ★ NEW — Ordered guess history. Empty array in lobby. |
| `scores` | `Record<string, number>` | Yes | ★ NEW — Per-participant cumulative scores. Keyed by participant ID. |
| `createdAt` | `string` (ISO) | Yes | Server timestamp of room creation. |
| `updatedAt` | `string` (ISO) | Yes | Server timestamp of last mutation. |

**Validation rules**:
- `code` must be exactly 4 characters, uppercase, matching `/^[A-HJ-NP-Z2-9]{4}$/`
- `hostId` and `drawerId` must match a participant ID in `participants` (when set)
- `status` transitions: `"lobby"` → `"playing"` only
- `strokes`, `guesses`, `scores` are empty/`{}` when `status === "lobby"`

### Stroke

A single drawing action on the canvas.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participantId` | `string` | Yes | The drawer's participant ID |
| `points` | `Point[]` | Yes | Array of coordinate points forming the stroke |
| `color` | `string` | Yes | Stroke color (defaults to `"#000000"`) |
| `width` | `number` | Yes | Stroke width in pixels (defaults to `3`) |
| `timestamp` | `string` (ISO) | Yes | Server timestamp of stroke creation |

### Point

A single coordinate on the canvas.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `x` | `number` | Yes | X coordinate (relative to canvas dimensions) |
| `y` | `number` | Yes | Y coordinate (relative to canvas dimensions) |

**Validation rules**:
- Coordinates are normalized as fractions 0–1 (relative positioning) for consistent rendering across different canvas sizes

### Guess

A single guess submitted by a participant.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participantId` | `string` | Yes | The guesser's participant ID |
| `displayName` | `string` | Yes | The guesser's display name at time of guess |
| `text` | `string` | Yes | Original submitted text (pre-trim, for history display) |
| `normalized` | `string` | Yes | Trimmed + case-folded text (for verification) |
| `correct` | `boolean` | Yes | Whether the guess matched the secret word |
| `score` | `number` | Yes | Points awarded: 100 for first correct, 0 otherwise |
| `timestamp` | `string` (ISO) | Yes | Server timestamp of guess submission |

**Validation rules**:
- `text` length after trim must be ≤ 100 characters
- `text` after trim must not be empty
- `correct` is determined by: `normalized === secretWord.toLowerCase()`
- `score` is 100 if `correct === true` AND this is the guesser's first correct guess in the round, otherwise 0

### RoomSnapshot

Read-only projection of Room sent to clients. Extended from FG1/FG2.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | Room code |
| `status` | `RoomStatus` | Yes | Current phase |
| `participants` | `Participant[]` | Yes | All participants |
| `hostId` | `string` | Yes | Current host's participant ID |
| `drawerId` | `string \| null` | Yes | Drawer's participant ID. `null` in lobby. |
| `strokes` | `Stroke[]` | Yes | ★ NEW — Current canvas strokes |
| `guesses` | `Guess[]` | Yes | ★ NEW — Full guess history |
| `scores` | `Record<string, number>` | Yes | ★ NEW — Current scores per participant |
| `availableWords` | `string[]` | Yes | Starter word list |
| `roles` | `string[]` | Yes | `["drawer", "guesser"]` |

## State Transitions

```
Room Status:
  [lobby] ──(host clicks start)──→ [playing]

Canvas:
  [empty] ──(drawer draws)──→ [has strokes]
  [has strokes] ──(drawer clears)──→ [empty]

Guess History:
  [empty] ──(guess submitted)──→ [has guesses]
  [has guesses] ──(new guess)──→ [appended]

Scores:
  [all 0] ──(correct guess)──→ [player +100]
  [player scored] ──(duplicate correct)──→ [unchanged]
```

## Key Business Rules

1. **Only drawer draws**: Stroke submission is accepted only from `participantId === room.drawerId`. Non-drawers cannot add strokes.
2. **Exact match required**: A guess is correct iff `guess.toLowerCase().trim() === secretWord.toLowerCase()`. Substrings, plurals, and synonyms are incorrect.
3. **First correct only**: A player's first correct guess in a round scores 100. Subsequent correct guesses by the same player score 0.
4. **Multiple scorers**: All guessers who meet the criteria score independently. Correct guesses are not exclusive.
5. **Deterministic scoring**: The same guess against the same secret word always produces the same correctness and score.
6. **Chronological history**: Guesses are ordered by server acceptance time. All viewers see the same ordering.
7. **Strokes are additive**: Clearing the canvas removes all strokes. There is no undo or per-stroke deletion.
