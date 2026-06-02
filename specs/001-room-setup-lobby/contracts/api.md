# API Contracts: Room Setup & Lobby

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## Common Types

```typescript
interface Participant {
  id: string;        // UUID v4
  name: string;      // Display name, may be "Player"
  joinedAt: string;  // ISO 8601 timestamp
}

type RoomStatus = "lobby" | "playing";

interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  hostId: string;
  availableWords: string[];
  roles: string[];  // ["drawer", "guesser"]
}
```

---

## POST /rooms — Create Room

### Request
```json
{
  "playerName": "Alice" // optional string, defaults to "Player"
}
```

### Response (201)
```json
{
  "participantId": "uuid",
  "room": { /* RoomSnapshot with status: "lobby", hostId matches participantId */ }
}
```

---

## POST /rooms/:code/join — Join Room

### Path Parameters
- `code`: 4-character uppercase room code

### Request
```json
{
  "playerName": "Bob" // optional string, defaults to "Player"
}
```

### Response (200)
```json
{
  "participantId": "uuid",
  "room": { /* RoomSnapshot with updated participants */ }
}
```

### Error (404)
```json
{
  "message": "Room not found"
}
```

### Client-Side Validation
- Empty string → "Room code is required" error before any server request
- Whitespace-only → trimmed to empty, same error

---

## GET /rooms/:code — Fetch Room

### Query Parameters
- `participantId` (optional): used for future per-viewer filtering

### Response (200)
```json
{
  "room": { /* RoomSnapshot */ }
}
```

### Error (404)
```json
{
  "message": "Room not found"
}
```

---

## PATCH /rooms/:code/start — Start Game (HOST ONLY)

### Request
```json
{
  "participantId": "uuid-of-requester"
}
```

### Success (200)
```json
{
  "room": { /* RoomSnapshot with status: "playing" */ }
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

**404 — Room not found**
```json
{
  "message": "Room not found"
}
```
