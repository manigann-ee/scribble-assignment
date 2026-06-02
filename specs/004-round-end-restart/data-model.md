# Data Model: Round End & Restart

**Phase**: 1 — Design & Contracts | **Date**: 2026-06-02

## Entities

### Room (extended)

The core game session. Extended from FG1/FG2/FG3 with reveal state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | 4-char uppercase alphanumeric. Unique key. |
| `status` | `RoomStatus` | Yes | Current phase: `"lobby"`, `"playing"`, or `"reveal"` |
| `participants` | `Participant[]` | Yes | All joined players. Survives restart. |
| `hostId` | `string` | Yes | Participant ID of the room creator. Controls game lifecycle. |
| `drawerId` | `string \| null` | Yes | Current round's drawer. Cleared on restart. |
| `secretWord` | `string \| null` | Yes | Round's secret word. Visible to all on reveal. Cleared on restart. |
| `strokes` | `Stroke[]` | Yes | Canvas strokes from current round. Cleared on restart. |
| `guesses` | `Guess[]` | Yes | Guess history from current round. Cleared on restart. |
| `scores` | `Record<string, number>` | Yes | Per-participant cumulative scores. Cleared on restart. |
| `createdAt` | `string` (ISO) | Yes | Server timestamp of room creation. |
| `updatedAt` | `string` (ISO) | Yes | Server timestamp of last mutation. |

**RoomStatus**:
```typescript
type RoomStatus = "lobby" | "playing" | "reveal"
```

**Validation rules**:
- `status` transitions: `"lobby"` → `"playing"` → `"reveal"` → `"lobby"`
- When `status === "reveal"`: drawing and guessing actions are rejected
- When `status === "lobby"`: round-specific fields are all null/empty

### RoomSnapshot (extended)

Read-only projection sent to clients.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | Room code |
| `status` | `RoomStatus` | Yes | Current phase |
| `participants` | `Participant[]` | Yes | All participants |
| `hostId` | `string` | Yes | Host's participant ID |
| `drawerId` | `string \| null` | Yes | Current drawer or null |
| `secretWord` | `string \| null` | Yes | Revealed to ALL when `status === "reveal"` |
| `strokes` | `Stroke[]` | Yes | Canvas strokes |
| `guesses` | `Guess[]` | Yes | Guess history |
| `scores` | `Record<string, number>` | Yes | Cumulative scores |
| `availableWords` | `string[]` | Yes | Starter word list |
| `roles` | `string[]` | Yes | `["drawer", "guesser"]` |

**Visibility rule for `secretWord`**:
- `status === "playing"`: only visible to the drawer (participantId === drawerId)
- `status === "reveal"`: visible to ALL players
- `status === "lobby"`: null for everyone

## State Transitions

```
Room Status:
  [lobby] ──(start game)──→ [playing]
  [playing] ──(host ends / all correct)──→ [reveal]
  [reveal] ──(host restarts)──→ [lobby]

Frontend Navigation:
  LobbyPage ──→ GamePage ──→ ResultPage ──→ LobbyPage
```

## Key Business Rules

1. **Host controls lifecycle**: Only the host can end the round (FR-013). Only the host can restart (FR-006).
2. **Round state is ephemeral**: All round data (word, strokes, guesses, scores, drawer) is cleared on restart. Only participants and room code survive.
3. **Reveal locks gameplay**: No drawing or guessing allowed while in reveal status (FR-015).
4. **Restart is idempotent**: Multiple restart requests have no side effects beyond the first (FR-011).
5. **Secret word revealed to all**: During reveal, the secret word is visible to every player in the room, not just the drawer.
