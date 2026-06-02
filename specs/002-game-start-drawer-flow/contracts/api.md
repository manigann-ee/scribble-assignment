# API Contracts: Game Start & Drawer Flow

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## Common Types (extended from FG1)

```typescript
interface Participant {
  id: string;        // UUID v4
  name: string;      // Display name
  joinedAt: string;  // ISO 8601 timestamp
}

type RoomStatus = "lobby" | "playing";

interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  hostId: string;
  drawerId: string | null;  // ★ NEW — null in lobby, participant ID when playing
  availableWords: string[];
  roles: string[];  // ["drawer", "guesser"]
}

interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
  secretWord?: string;  // ★ NEW — only present when participantId === room.drawerId
}
```

---

## POST /rooms — Create Room

**Unchanged from FG1.** Response now includes `drawerId: null` in the snapshot.

### Request
```json
{
  "playerName": "Alice"
}
```

### Response (201)
```json
{
  "participantId": "uuid",
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [{ "id": "uuid", "name": "Alice", "joinedAt": "..." }],
    "hostId": "uuid",
    "drawerId": null,
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

---

## POST /rooms/:code/join — Join Room

**Unchanged from FG1.** Response now includes `drawerId: null` in the snapshot and `secretWord` is absent (lobby).

### Response (200)
```json
{
  "participantId": "uuid",
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "joinedAt": "..." },
      { "id": "uuid-2", "name": "Bob", "joinedAt": "..." }
    ],
    "hostId": "uuid-1",
    "drawerId": null,
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

---

## GET /rooms/:code — Fetch Room

**Extended from FG1.** `viewerParticipantId` query param now activates per-viewer filtering. When the viewer is the drawer, `secretWord` is included in the response wrapper.

### Query Parameters
- `participantId` (optional): triggers per-viewer word visibility filtering

### Response (200) — Viewer is NOT the drawer
```json
{
  "participantId": "uuid-viewer",
  "room": {
    "code": "ABCD",
    "status": "playing",
    "participants": [...],
    "hostId": "uuid-host",
    "drawerId": "uuid-host",
    "availableWords": [...],
    "roles": ["drawer", "guesser"]
  }
  // No secretWord field
}
```

### Response (200) — Viewer IS the drawer
```json
{
  "participantId": "uuid-host",
  "room": {
    "code": "ABCD",
    "status": "playing",
    "participants": [...],
    "hostId": "uuid-host",
    "drawerId": "uuid-host",
    "availableWords": [...],
    "roles": ["drawer", "guesser"]
  },
  "secretWord": "rocket"
}
```

### Error (404)
```json
{
  "message": "Unable to load room"
}
```

---

## PATCH /rooms/:code/start — Start Game (HOST ONLY)

**Extended from FG1.** Now performs name validation, assigns drawer, selects word. Response includes `secretWord` for the drawer (requester).

### Request
```json
{
  "participantId": "uuid-of-requester"
}
```

### Success (200) — Requester is host, all names valid
```json
{
  "participantId": "uuid-host",
  "room": {
    "code": "ABCD",
    "status": "playing",
    "participants": [...],
    "hostId": "uuid-host",
    "drawerId": "uuid-host",
    "availableWords": [...],
    "roles": ["drawer", "guesser"]
  },
  "secretWord": "rocket"
}
```

### Errors

**403 — Not host**
```json
{
  "message": "Only the host can start the game"
}
```

**400 — Not enough players**
```json
{
  "message": "At least 2 players are required to start"
}
```

**400 — Empty player names**
```json
{
  "message": "All players must have a name"
}
```

**404 — Room not found**
```json
{
  "message": "Room not found"
}
```
