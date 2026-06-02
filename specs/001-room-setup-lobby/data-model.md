# Data Model: Room Setup & Lobby

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## Entities

### Room

The core game session. Created by a player, identified by a unique code.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | 4-char uppercase alphanumeric (excludes I,O,0,1). Unique key. |
| `status` | `RoomStatus` | Yes | Current phase: `"lobby"` or `"playing"`. |
| `participants` | `Participant[]` | Yes | Ordered by join time. At least 1 at all times. |
| `hostId` | `string` | Yes | Participant ID of the room host. Set at creation. |
| `createdAt` | `string` (ISO) | Yes | Server timestamp of room creation. |
| `updatedAt` | `string` (ISO) | Yes | Server timestamp of last mutation. |

**Validation rules**:
- `code` must be exactly 4 characters, uppercase, matching `/^[A-HJ-NP-Z2-9]{4}$/`
- `hostId` must match a participant ID in `participants`
- `status` transitions: `"lobby"` → `"playing"` only (no reverse transition in this feature)

### Participant

A player in a room.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` (UUID) | Yes | Unique participant identifier. Generated server-side. |
| `name` | `string` | Yes | Display name. Defaults to "Player" if empty. Not required to be unique. |
| `joinedAt` | `string` (ISO) | Yes | Server timestamp of join. Used for host transfer ordering. |

**Validation rules**:
- `name` is trimmed of leading/trailing whitespace
- Empty/whitespace-only names become "Player"
- Duplicate names are allowed

### RoomSnapshot

Read-only projection of Room sent to clients.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | Room code |
| `status` | `RoomStatus` | Yes | Current phase |
| `participants` | `Participant[]` | Yes | All participants |
| `hostId` | `string` | Yes | Current host's participant ID |
| `availableWords` | `string[]` | Yes | Starter word list |
| `roles` | `string[]` | Yes | `["drawer", "guesser"]` |

## State Transitions

```
Room Status:
  [lobby] ──(host clicks start, ≥2 players)──→ [playing]

Host Assignment:
  [no host] ──(room created)──→ [creator = host]
  [host present] ──(host leaves room)──→ [earliest remaining = new host]
```

## Key Business Rules

1. **Host invariant**: Every room always has a host. On creation, the creator is host. On host departure, host transfers.
2. **Minimum players**: Game can only start when `participants.length >= 2`. Check performed server-side.
3. **Read-after-write consistency**: All mutations update `updatedAt` and persist via `saveRoom()`. Subsequent `GET` returns latest state.
