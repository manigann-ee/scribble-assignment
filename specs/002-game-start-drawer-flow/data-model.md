# Data Model: Game Start & Drawer Flow

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## Entities

### Room

The core game session. Extended from FG1 with drawer assignment and secret word.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | 4-char uppercase alphanumeric (excludes I,O,0,1). Unique key. |
| `status` | `RoomStatus` | Yes | Current phase: `"lobby"` or `"playing"`. |
| `participants` | `Participant[]` | Yes | Ordered by join time. At least 1 at all times. |
| `hostId` | `string` | Yes | Participant ID of the room host. Set at creation. |
| `drawerId` | `string \| null` | Yes | ★ NEW — Participant ID assigned as drawer for the current round. Set on game start. `null` in lobby. |
| `secretWord` | `string \| null` | Yes | ★ NEW — The word selected for the current round. Stored server-side only. Never included in `RoomSnapshot`. `null` in lobby. |
| `createdAt` | `string` (ISO) | Yes | Server timestamp of room creation. |
| `updatedAt` | `string` (ISO) | Yes | Server timestamp of last mutation. |

**Validation rules**:
- `code` must be exactly 4 characters, uppercase, matching `/^[A-HJ-NP-Z2-9]{4}$/`
- `hostId` must match a participant ID in `participants`
- `drawerId` must match a participant ID in `participants` (when set)
- `status` transitions: `"lobby"` → `"playing"` only (no reverse transition)
- `drawerId` and `secretWord` are `null` when `status === "lobby"`, non-null when `status === "playing"`

### Participant

A player in a room. Unchanged from FG1.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` (UUID) | Yes | Unique participant identifier. Generated server-side. |
| `name` | `string` | Yes | Display name. Trimmed at game start. Rejected if empty/whitespace-only at game start. |
| `joinedAt` | `string` (ISO) | Yes | Server timestamp of join. Used for host transfer ordering. |

**Validation rules**:
- `name` is trimmed of leading/trailing whitespace at game start (FR-001)
- Empty/whitespace-only names cause game start rejection (FR-002)
- Duplicate names are allowed

### RoomSnapshot

Read-only projection of Room sent to clients. Never includes `secretWord`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | Room code |
| `status` | `RoomStatus` | Yes | Current phase |
| `participants` | `Participant[]` | Yes | All participants |
| `hostId` | `string` | Yes | Current host's participant ID |
| `drawerId` | `string \| null` | Yes | ★ NEW — Drawer's participant ID. `null` in lobby. |
| `availableWords` | `string[]` | Yes | Starter word list |
| `roles` | `string[]` | Yes | `["drawer", "guesser"]` |

### RoomSessionResponse

Response wrapper for per-viewer data delivery.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participantId` | `string` | Yes | The viewer's participant ID |
| `room` | `RoomSnapshot` | Yes | Room data (never contains secretWord) |
| `secretWord` | `string` | No | ★ NEW — Only present when viewer is the drawer (`participantId === room.drawerId`) |

## State Transitions

```
Room Status:
  [lobby] ──(host clicks start, ≥2 players, all names non-empty)──→ [playing]

Drawer Assignment:
  [no drawer] ──(game starts)──→ [hostId = drawerId]

Secret Word:
  [no word] ──(game starts)──→ [deterministic word from starter list]
```

## Key Business Rules

1. **Drawer = Host**: The room host is always the drawer for the first (and only) round. No drawer rotation.
2. **Name validation gate**: All participant names are trimmed at game start. If any name is empty after trim, the start is rejected. This is a second validation gate after FG1's "Player" default on join.
3. **Deterministic word selection**: `hash(room.code) % words.length` → index. Same room code always yields the same word.
4. **Per-viewer word delivery**: `secretWord` is only included in responses when the requesting participant is the drawer. The `RoomSnapshot` type never contains `secretWord`.
5. **Single round**: Only one round per game. The word is selected once at game start.
