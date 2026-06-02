# Implementation Plan: Room Setup & Lobby

**Branch**: `assignment` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-room-setup-lobby/spec.md`

## Summary

Add host tracking, room code validation, automatic lobby polling (~2s), host-only start-game permissions, and a 2-player minimum gate to the existing room system. Extend the backend data model and API, add polling to the frontend store, and wire the Lobby UI to enforce roles.

## Technical Context

**Language/Version**: TypeScript 5.6 (backend + frontend), Node 24.13

**Primary Dependencies**: Express 4.21 (backend), React 18 (frontend), Zod 3.23 (backend validation)

**Storage**: In-memory `Map<string, Room>` on the backend server

**Testing**: Vitest (backend: node env, frontend: jsdom env)

**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)

**Project Type**: Web application — Express REST backend + React SPA frontend

**Performance Goals**: Lobby state reflected across all clients within ~3s of a mutation (join, start)

**Constraints**: No WebSockets, no databases, no auth. All sync via HTTP polling (~2s interval). In-memory only.

**Scale/Scope**: Lab environment — 2–6 simultaneous players across multiple rooms

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Review Discipline** (Artifact Order): spec.md exists and was created before this plan → PASS
- **Out of Scope Enforcement**: All design elements use HTTP polling (no WebSockets), in-memory storage (no databases), no auth, no spectator/moderator features → PASS
- **Testing Principles** (Acceptance Criteria Observability): Test strategy defined in this plan covers AC-US1–AC-US4, EC-01–EC-06 via unit + integration + E2E tests → PASS
- **Engineering Principles** (Extend, Don't Rewrite): Every change adds to existing files (`Room` model, `roomStore`, `LobbyPage`) rather than replacing them. All behaviors trace to FR-/AC- IDs → PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-room-setup-lobby/
├── plan.md              # This file
├── research.md          # Phase 0 — architecture decisions
├── data-model.md        # Phase 1 — entity definitions
├── quickstart.md        # Phase 1 — setup instructions
├── contracts/           # Phase 1 — API contract definitions
├── spec.md              # Feature specification
└── tasks.md             # Phase 2 — task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/src/
├── app.ts                          # Express app setup — no changes
├── server.ts                       # Entry point — no changes
├── models/
│   └── game.ts                     # ✎ Expand Room + RoomSnapshot types
├── api/
│   ├── router.ts                   # No changes (routes registered via createApiRouter)
│   ├── rooms.ts                    # ✎ Add PATCH /rooms/:code/start endpoint
│   └── schemas.ts                  # ✎ Add startGameSchema, playerName validation
├── services/
│   └── roomStore.ts               # ✎ Host tracking, code validation, start-game logic
├── seed/
│   └── starterData.ts             # No changes
└── (tests co-located in src/)

frontend/src/
├── App.tsx                         # No changes
├── main.tsx                        # No changes
├── routes/index.tsx                 # No changes (start game navigates to /game)
├── state/
│   └── roomStore.ts                # ✎ Add polling (setInterval), startGame, hostId
├── services/
│   └── api.ts                      # ✎ Add startGame() method, hostId to RoomSnapshot
├── pages/
│   ├── StartPage.tsx               # No changes
│   ├── CreateRoomPage.tsx          # No changes (host assigned server-side)
│   ├── JoinRoomPage.tsx            # ✎ Add client-side empty/whitespace code validation
│   ├── LobbyPage.tsx               # ✎ Auto-polling, host-only start button, 2-player gate
│   └── GamePage.tsx                # No changes for this feature group
├── components/
│   ├── AppShell.tsx                # No changes
│   ├── Card.tsx                    # No changes
│   ├── GuessForm.tsx               # No changes (placeholder)
│   ├── PageHeader.tsx              # No changes
│   ├── ResultPanel.tsx             # No changes (placeholder)
│   ├── RoomCodeBadge.tsx           # No changes
│   └── Scoreboard.tsx              # No changes (placeholder)
└── styles/
    └── app.css                     # No changes
```

**Structure Decision**: Existing monorepo with `backend/` and `frontend/` directories. All changes extend existing files — no new directories, no new top-level dependencies.

## State Model

### Backend Types (`backend/src/models/game.ts`)

**Room** (extended from starter):
```typescript
RoomStatus = "lobby" | "playing"   // expanded from just "lobby"

Room {
  code: string                      // unchanged — 4-char unique code
  status: RoomStatus                // expanded
  participants: Participant[]       // unchanged — array of participants
  hostId: string                    // ★ NEW — participant ID of the host
  createdAt: string                 // unchanged — ISO timestamp
  updatedAt: string                 // unchanged — ISO timestamp
}

RoomSnapshot {
  code: string                      // unchanged
  status: RoomStatus                // expanded
  participants: Participant[]       // unchanged
  hostId: string                    // ★ NEW — visible to all clients
  availableWords: string[]          // unchanged
  roles: ParticipantRole[]          // unchanged
}
```

**Participant** (unchanged from starter):
```typescript
Participant {
  id: string                        // UUID
  name: string                      // display name
  joinedAt: string                  // ISO timestamp
}
```

### Frontend Types (`frontend/src/services/api.ts`)

Mirror the backend `RoomSnapshot` with the added `hostId` field.

### Frontend State (`frontend/src/state/roomStore.ts`)

Extended `RoomState`:
```typescript
RoomState {
  room: RoomSnapshot | null         // unchanged
  participantId: string | null      // unchanged
  error: string | null              // unchanged
  isLoading: boolean                // unchanged
  isHost: boolean                   // ★ NEW — derived: participantId === room.hostId
}
```

## Data Flow

### Room Creation
```
Player fills name → POST /rooms { playerName }
  → Backend creates Room with hostId = creator's participantId
  → Returns { participantId, room: RoomSnapshot }
  → Frontend stores session, navigates to /lobby
```
Requirements: FR-001, FR-002, FR-013

### Room Join
```
Player fills code + name → POST /rooms/:code/join { playerName }
  → Backend validates code exists, adds participant
  → Returns { participantId, room: RoomSnapshot }
  → Frontend stores session, navigates to /lobby
  → Client-side: empty/whitespace code rejected before server call
```
Requirements: FR-003, FR-004, FR-005, FR-006, FR-007, FR-014

### Lobby Polling
```
LobbyPage mounts → setInterval(~2s) → GET /rooms/:code?participantId=
  → Backend returns current RoomSnapshot
  → Frontend updates room state (participant list, hostId)
  → On poll error: show error message, retry next interval
```
Requirements: FR-009, NFR-001, NFR-002

### Host Start Game
```
Host clicks "Start Game" (enabled only when participants.length >= 2)
  → PATCH /rooms/:code/start { participantId }
  → Backend validates: participantId === room.hostId AND participants >= 2
  → Backend sets status = "playing"
  → All clients see status change on next poll
```
Requirements: FR-010, FR-011

### Host Transfer (on disconnect)
```
On next poll after host leaves:
  → Backend detects hostId not in participants
  → Backend reassigns hostId to earliest-remaining participant
  → All clients see updated hostId on next poll
```
Requirements: FR-012

## Polling Strategy

**Mechanism**: `setInterval`-based HTTP polling in the frontend `RoomStore` class.

**Activation**: Polling starts when `LobbyPage` mounts (via `useEffect`). It stops when the component unmounts (cleanup via `clearInterval`).

**Interval**: `2000ms` (approximately 2 seconds, per NFR-001 ±1s tolerance).

**Error handling**: On failed poll request, an error message is displayed in the UI. The polling interval continues — a single failure does not stop future polls (NFR-002). No exponential backoff needed at this scale.

**Graceful stop**: Poll timer is cleared on component unmount (navigating away from lobby).

**Implementation**: The `RoomStore` class gains `startPolling()` and `stopPolling()` methods that manage the interval internally.

## API Design

### Existing Endpoints (unchanged signatures, added hostId in response)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check |
| `GET` | `/` | API info |
| `POST` | `/rooms` | Create room |
| `POST` | `/rooms/:code/join` | Join room |
| `GET` | `/rooms/:code` | Get room snapshot |

### New Endpoint

**`PATCH /rooms/:code/start`** — Start game (host only)

**Request**:
```json
{
  "participantId": "uuid-of-requester"
}
```

**Success (200)**:
```json
{
  "room": { /* RoomSnapshot with status: "playing", hostId */ }
}
```

**Errors**:
| Status | Condition | Message |
|--------|-----------|---------|
| `403` | Requester is not host | "Only the host can start the game" |
| `400` | < 2 participants | "At least 2 players are required to start" |
| `404` | Room code not found | "Room not found" |

Requirements: FR-010, FR-011

### Response Shape Changes

All existing `RoomSnapshot` responses now include `hostId: string` alongside existing fields.

## File-Level Plan

### Phase A — Backend Model & Store

| File | Change | Requirements |
|------|--------|--------------|
| `backend/src/models/game.ts` | Add `hostId: string` to `Room` and `RoomSnapshot`. Expand `RoomStatus` to `"lobby" \| "playing"`. | FR-002, FR-010 |
| `backend/src/services/roomStore.ts` | Set `hostId` in `createRoom()`. Add `startGame(code, participantId)` with host + player-count validation. Add `transferHost(room, leavingParticipantId)`. Trim player names; default to "Player" on empty. | FR-002, FR-010, FR-011, FR-012, FR-013 |
| `backend/src/api/schemas.ts` | Add `startGameSchema` (participantId required). Tighten `playerName` validation (trim, optional string). | FR-010, FR-013 |
| `backend/src/api/rooms.ts` | Add `PATCH /:code/start` route calling `startGame()`. Wire `saveRoom()` after state mutations. | FR-010, FR-011 |

### Phase B — Frontend API & State

| File | Change | Requirements |
|------|--------|--------------|
| `frontend/src/services/api.ts` | Add `startGame(code, participantId)` → `PATCH /rooms/:code/start`. Add `hostId` to `RoomSnapshot` interface. | FR-010 |
| `frontend/src/state/roomStore.ts` | Add `startGame()` method. Add `startPolling()`/`stopPolling()` with `setInterval`. Compute `isHost` from `participantId === room.hostId`. | FR-009, FR-010, NFR-001, NFR-002 |

### Phase C — Frontend UI

| File | Change | Requirements |
|------|--------|--------------|
| `frontend/src/pages/LobbyPage.tsx` | Add `useEffect` → `startPolling()` on mount, `stopPolling()` on unmount. Conditionally disable/hide "Start Game" based on `isHost` and `participants.length >= 2`. Show polling error state. | FR-009, FR-010, FR-011, NFR-001, NFR-002 |
| `frontend/src/pages/JoinRoomPage.tsx` | Add client-side validation: reject empty/whitespace-only room code before sending request. Show "Room code is required" error. | FR-005, FR-006 |

## Testing Strategy

### Unit Tests (backend — Vitest, node env)

| Test | What It Verifies | Req. |
|------|------------------|------|
| `createRoom` sets `hostId` equal to creator's participant ID | FR-002 |
| `createRoom` assigns default name "Player" when name is empty/whitespace | FR-013 |
| `joinRoom` rejects nonexistent code → returns null | FR-007 |
| `joinRoom` allows duplicate display names | FR-014 |
| `startGame` fails if requester is not host → throws 403 | FR-010 |
| `startGame` fails if < 2 participants → throws 400 | FR-011 |
| `startGame` succeeds when host + ≥2 participants → status = "playing" | FR-010, FR-011 |
| `transferHost` reassigns host when current host leaves | FR-012 |
| `generateUniqueCode` never produces duplicate codes | FR-004 |
| Room A operations do not affect Room B | FR-008 |

### Unit Tests (frontend — Vitest, jsdom env)

| Test | What It Verifies | Req. |
|------|------------------|------|
| `api.startGame` sends PATCH to correct URL with participantId body | FR-010 |
| `roomStore.startPolling` sets up interval | NFR-001 |
| `roomStore.stopPolling` clears interval | NFR-002 |
| Empty room code rejected before API call | FR-005 |
| Whitespace-only code trimmed and rejected as empty | FR-006 |

### Integration Tests (backend)

| Test | What It Verifies | Req. |
|------|------------------|------|
| Full flow: create → join → fetch → start game | FR-001, FR-002, FR-003, FR-010, FR-011 |
| Two independent rooms: snapshots show correct participants per room | FR-008 |

### E2E / Manual Tests (two browser tabs)

| Verification | Req. / AC |
|-------------|-----------|
| Tab A creates room → sees host badge. Tab B joins → sees players + code | AC-US1-01, AC-US2-01 |
| Tab B joins without name → default "Player" shown | AC-US1-02, AC-US2-02 |
| Tab B enters empty code → error, stays on Join screen | EC-01, AC-US2-04 |
| Tab B enters whitespace code → error, stays on Join screen | EC-02, AC-US2-05 |
| Tab B enters nonexistent code "ZZZZ" → "Room not found" | EC-03, AC-US2-06 |
| Tab B joins with same name as Tab A → both accepted | EC-04 |
| Tab A sees Tab B appear within ~3s without manual refresh | AC-US3-01, SC-005 |
| Only Tab A (host) sees enabled "Start Game" button | AC-US4-01, AC-US4-03 |
| Tab A cannot start when alone (only 1 player) | AC-US4-02, SC-004 |
| Tab A starts game → both tabs show Game screen | AC-US4-01 |

## Complexity Tracking

> No Constitution violations detected. All changes extend existing files and patterns.

## Requirement Traceability Map

| Req. | Plan Coverage |
|------|---------------|
| FR-001 — Room Creation | State Model (Room.code), API Design (POST /rooms), Phase A (roomStore.createRoom), Tests |
| FR-002 — Host Assignment | State Model (Room.hostId), Data Flow (Creation), Phase A (roomStore.createRoom), Tests |
| FR-003 — Join by Code | API Design (POST /rooms/:code/join), Data Flow (Join), Phase A, Tests |
| FR-004 — Room Code Format | State Model (Room.code), Phase A (generateUniqueCode), Tests |
| FR-005 — Empty Code Rejection | Data Flow (Join — client validation), Phase C (JoinRoomPage), Tests |
| FR-006 — Whitespace Code Handling | Phase A (trim), Phase C (JoinRoomPage), Tests |
| FR-007 — Nonexistent Code Handling | API Design (404 error), Phase A, Tests |
| FR-008 — Room Isolation | Phase A (Map-based storage), Tests |
| FR-009 — Lobby Polling | Polling Strategy, Phase B (store), Phase C (LobbyPage), Tests |
| FR-010 — Host-Only Start Game | API Design (PATCH /start), Data Flow, Phase A+B+C, Tests |
| FR-011 — Minimum Players to Start | Data Flow (Start), Phase A (validation), Phase C (button), Tests |
| FR-012 — Host Transfer | Data Flow (Host Transfer), Phase A (transferHost), Tests |
| FR-013 — Player Name Default | Phase A (default logic), Tests |
| FR-014 — Duplicate Names | Phase A (no unique constraint), Tests |
| NFR-001 — Polling Cadence | Polling Strategy (2000ms), Phase B, Tests |
| NFR-002 — Polling Reliability | Polling Strategy (error handling), Phase B+C, Tests |
| NFR-003 — Error Message Clarity | Phase C (UI strings), Edge Cases |
| NFR-004 — No Auth | Design constraint |
| NFR-005 — No Real-Time | Design constraint |
| SC-001 → SC-006 | Covered by E2E/manual test scenarios |
