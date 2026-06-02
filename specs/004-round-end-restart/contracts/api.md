# API Contracts: Round End & Restart

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## POST /rooms/:code/end-round — End Round (HOST ONLY)

Ends the active round and transitions all players to the result/reveal screen.

### Request
```json
{
  "participantId": "uuid-of-host"
}
```

### Response (200)
```json
{
  "room": {
    "code": "ABCD",
    "status": "reveal",
    "participants": [...],
    "hostId": "uuid-of-host",
    "drawerId": "uuid-of-drawer",
    "secretWord": "rocket",
    "strokes": [...],
    "guesses": [...],
    "scores": { "uuid-guesser": 100, "uuid-other": 0 },
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### Errors

**403 — Not host**
```json
{ "message": "Only the host can end the round" }
```

**400 — Round not active**
```json
{ "message": "Round is not currently active" }
```

**404 — Room not found**
```json
{ "message": "Room not found" }
```

---

## POST /rooms/:code/restart — Restart Game (HOST ONLY)

Clears round state and returns all players to the lobby.

### Request
```json
{
  "participantId": "uuid-of-host"
}
```

### Response (200)
```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [...],
    "hostId": "uuid-of-host",
    "drawerId": null,
    "secretWord": null,
    "strokes": [],
    "guesses": [],
    "scores": {},
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### Errors

**403 — Not host**
```json
{ "message": "Only the host can restart the game" }
```

**400 — Not in reveal state**
```json
{ "message": "Game can only be restarted from the result screen" }
```

**404 — Room not found**
```json
{ "message": "Room not found" }
```

---

## GET /rooms/:code — Fetch Room (extended)

### Query Parameters
- `participantId` (optional): used for per-viewer field filtering

### Response (200) — status === "reveal"
```json
{
  "room": {
    "code": "ABCD",
    "status": "reveal",
    "participants": [...],
    "hostId": "uuid-of-host",
    "drawerId": null,
    "secretWord": "rocket",
    "strokes": [...],
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
    "scores": { "uuid-guesser": 100 },
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### Response (200) — status === "lobby" (after restart)
```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [
      { "id": "uuid-host", "name": "Host", "joinedAt": "..." },
      { "id": "uuid-guesser", "name": "Alice", "joinedAt": "..." }
    ],
    "hostId": "uuid-host",
    "drawerId": null,
    "secretWord": null,
    "strokes": [],
    "guesses": [],
    "scores": {},
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```
