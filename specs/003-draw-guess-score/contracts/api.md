# API Contracts: Draw, Guess & Score

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## Common Types (extended from FG1/FG2)

```typescript
interface Point {
  x: number;  // 0–1 normalized fraction
  y: number;  // 0–1 normalized fraction
}

interface Stroke {
  participantId: string;  // always the drawer
  points: Point[];
  color: string;           // "#000000"
  width: number;           // 3
  timestamp: string;       // ISO 8601
}

interface Guess {
  participantId: string;
  displayName: string;
  text: string;            // original submitted text
  normalized: string;      // trimmed + case-folded
  correct: boolean;
  score: number;           // 100 or 0
  timestamp: string;
}

type Scores = Record<string, number>;  // participantId → cumulative score
```

Extend `RoomSnapshot`:

```typescript
interface RoomSnapshot {
  // ...existing fields from FG1/FG2...
  strokes: Stroke[];
  guesses: Guess[];
  scores: Scores;
}
```

---

## POST /rooms/:code/strokes — Add Stroke (DRAWER ONLY)

### Request
```json
{
  "participantId": "uuid-of-drawer",
  "points": [{ "x": 0.1, "y": 0.2 }, { "x": 0.3, "y": 0.4 }],
  "color": "#000000",
  "width": 3
}
```

### Response (201)
```json
{
  "stroke": {
    "participantId": "uuid-of-drawer",
    "points": [{ "x": 0.1, "y": 0.2 }, { "x": 0.3, "y": 0.4 }],
    "color": "#000000",
    "width": 3,
    "timestamp": "2026-06-02T12:00:00.000Z"
  }
}
```

### Errors

**403 — Not drawer**
```json
{ "message": "Only the drawer can add strokes" }
```

**400 — Invalid stroke data**
```json
{ "message": "Stroke must contain at least 2 points" }
```

**404 — Room not found**
```json
{ "message": "Room not found" }
```

---

## DELETE /rooms/:code/strokes — Clear Canvas (DRAWER ONLY)

### Request
```json
{
  "participantId": "uuid-of-drawer"
}
```

### Response (200)
```json
{
  "strokes": []
}
```

### Errors

**403 — Not drawer**
```json
{ "message": "Only the drawer can clear the canvas" }
```

**404 — Room not found**
```json
{ "message": "Room not found" }
```

---

## POST /rooms/:code/guess — Submit Guess

### Request
```json
{
  "participantId": "uuid-of-guesser",
  "text": "  Rocket  "
}
```

### Response (200) — Correct, first time
```json
{
  "correct": true,
  "score": 100,
  "guess": {
    "participantId": "uuid-of-guesser",
    "displayName": "Alice",
    "text": "  Rocket  ",
    "normalized": "rocket",
    "correct": true,
    "score": 100,
    "timestamp": "2026-06-02T12:00:00.000Z"
  }
}
```

### Response (200) — Correct, already guessed
```json
{
  "correct": true,
  "score": 0,
  "guess": { "...": "..." }
}
```

### Response (200) — Incorrect
```json
{
  "correct": false,
  "score": 0,
  "guess": {
    "participantId": "uuid-of-guesser",
    "displayName": "Alice",
    "text": "pizza",
    "normalized": "pizza",
    "correct": false,
    "score": 0,
    "timestamp": "2026-06-02T12:00:00.000Z"
  }
}
```

### Errors

**400 — Empty guess**
```json
{ "message": "Guess cannot be empty" }
```

**400 — Guess too long**
```json
{ "message": "Guess must be 100 characters or fewer" }
```

**400 — Round not active**
```json
{ "message": "Round is over" }
```

**404 — Room not found**
```json
{ "message": "Room not found" }
```

---

## GET /rooms/:code — Fetch Room (extended)

### Query Parameters
- `participantId` (optional): triggers per-viewer word visibility filtering

### Response (200)
```json
{
  "participantId": "uuid-viewer",
  "room": {
    "code": "ABCD",
    "status": "playing",
    "participants": [...],
    "hostId": "uuid-host",
    "drawerId": "uuid-drawer",
    "strokes": [
      {
        "participantId": "uuid-drawer",
        "points": [{ "x": 0.1, "y": 0.2 }, { "x": 0.3, "y": 0.4 }],
        "color": "#000000",
        "width": 3,
        "timestamp": "..."
      }
    ],
    "guesses": [
      {
        "participantId": "uuid-guesser",
        "displayName": "Alice",
        "text": "rocket",
        "normalized": "rocket",
        "correct": true,
        "score": 100,
        "timestamp": "..."
      }
    ],
    "scores": { "uuid-guesser": 100, "uuid-other": 0 },
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  },
  "secretWord": "rocket"  // only when viewer is drawer
}
```
