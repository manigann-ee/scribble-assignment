# Implementation Plan: Game Start & Drawer Flow

**Branch**: `assignment` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-game-start-drawer-flow/spec.md`

## Summary

Extend the start-game flow to validate player names at game start, assign the drawer role, select a secret word deterministically from the starter list, and enforce per-role word visibility — the drawer sees the word, guessers do not.

## Technical Context

**Language/Version**: TypeScript 5.6, Node 24.13

**Primary Dependencies**: Express 4.21 (backend), React 18 (frontend), Zod 3.23 (backend)

**Storage**: In-memory `Map<string, Room>` on the backend server

**Testing**: Vitest (backend: node env, frontend: jsdom env)

**Target Platform**: Modern browsers

**Project Type**: Web application — Express REST backend + React SPA frontend

**Performance Goals**: Room status reflects across clients within ~3s of game start via polling

**Constraints**: No WebSockets — word visibility enforced via per-viewer `toRoomSnapshot` filtering. No databases. No auth.

**Scale/Scope**: 2–6 simultaneous players, single round per game

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Review Discipline**: spec.md exists and was created before this plan → PASS
- **Out of Scope Enforcement**: No WebSockets (word hidden via snapshot filtering), no auth, no databases, no multiple rounds → PASS
- **Testing Principles**: Test strategy covers name validation, drawer assignment, word determinism, and per-role visibility → PASS
- **Engineering Principles** (Extend, Don't Rewrite): All changes add fields to existing models and extend existing `startGame` / `toRoomSnapshot` functions. No new files needed → PASS

## Project Structure

### Documentation (this feature)

```text
specs/002-game-start-drawer-flow/
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
├── models/
│   └── game.ts                     # ✎ Add drawerId, secretWord to Room; role to RoomSnapshot
├── services/
│   └── roomStore.ts               # ✎ Extend startGame: name validation, drawer assignment, word selection. Fix toRoomSnapshot per-viewer filtering.
├── api/
│   ├── rooms.ts                    # ✎ Update PATCH /:code/start response with drawer info
│   └── schemas.ts                  # No changes (startGameSchema exists from FG1)
├── app.ts                          # No changes
├── server.ts                       # No changes
└── seed/starterData.ts             # No changes

frontend/src/
├── services/
│   └── api.ts                      # ✎ Add drawerId, isDrawer-aware types
├── state/
│   └── roomStore.ts                # ✎ Add isDrawer, isGuesser computation; word state
├── pages/
│   ├── LobbyPage.tsx               # ✎ Add name validation before start; pass drawer info
│   ├── GamePage.tsx                # ✎ Show drawer badge + secret word (drawer only); hide word (guesser)
│   └── JoinRoomPage.tsx            # No changes
├── components/
│   └── (existing)                  # No new components needed for this feature
└── routes/index.tsx                 # No changes
```

**Structure Decision**: Existing monorepo with `backend/` and `frontend/`. All changes extend existing files. The critical architectural change is activating `toRoomSnapshot`'s per-viewer filtering (currently voided).

## State Model

### Backend Types (`backend/src/models/game.ts`)

**Room** (extended from FG1):
```typescript
Room {
  code: string                      // unchanged
  status: "lobby" | "playing"       // unchanged
  participants: Participant[]       // unchanged
  hostId: string                    // unchanged
  drawerId: string | null           // ★ NEW — participant ID assigned as drawer
  secretWord: string | null         // ★ NEW — selected word (server-only, never in snapshot)
  createdAt: string                 // unchanged
  updatedAt: string                 // unchanged
}

RoomSnapshot {
  code: string                      // unchanged
  status: "lobby" | "playing"       // unchanged
  participants: Participant[]       // unchanged
  hostId: string                    // unchanged
  drawerId: string | null           // ★ NEW — always visible; tells who is drawing
  availableWords: string[]          // unchanged
  roles: ParticipantRole[]          // unchanged
  // secretWord: NOT included here — filtered per-viewer via separate field on response
}
```

New response shape for per-viewer word delivery:
```typescript
interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
  secretWord?: string;    // ★ NEW — only present when viewer is the drawer
}
```

### Frontend Types (`frontend/src/services/api.ts`)

```typescript
RoomSnapshot {
  // ...existing fields...
  drawerId: string | null           // ★ NEW
}

RoomSessionResponse {
  participantId: string
  room: RoomSnapshot
  secretWord?: string               // ★ NEW — optional, only for drawer
}
```

### Frontend State (`frontend/src/state/roomStore.ts`)

```typescript
RoomState {
  // ...existing fields...
  isHost: boolean                   // unchanged
  isDrawer: boolean                 // ★ NEW — participantId === room.drawerId
  secretWord: string | null          // ★ NEW — stored from response (null for guessers)
}
```

## Data Flow

### Game Start (extended from FG1)
```
Host clicks "Start Game"
  → Client-side: check participants.length >= 2
  → PATCH /rooms/:code/start { participantId }
  → Backend startGame():
      1. Trim all participant names
      2. If any name is empty/whitespace → reject (400)
      3. Assign drawerId = hostId
      4. Select word: hash(room.code) % words.length → index
      5. Set room.secretWord = words[index]
      6. Set room.status = "playing"
  → Response (to requester = host = drawer):
      { room: RoomSnapshot, secretWord: "rocket" }
  → Response (to other players on next poll):
      { room: RoomSnapshot }  // no secretWord
```
Requirements: FR-001, FR-002, FR-003, FR-005, FR-008

### Per-Viewer Snapshot Delivery (GET /rooms/:code)
```
GET /rooms/:code?participantId=XYZ
  → toRoomSnapshot(room, "XYZ"):
      1. Start with common fields (code, status, participants, hostId, drawerId)
      2. If viewerParticipantId === room.drawerId → include secretWord
      3. If viewerParticipantId !== room.drawerId → exclude secretWord
  → Response varies by viewer role
```
Requirements: FR-006, FR-007

## Word Selection Algorithm

**Input**: Room code (4 chars, uppercase alphanumeric)
**Process**: Convert code to a numeric hash, take modulo word count
```text
hash = code.charCodeAt(0) + code.charCodeAt(1) + code.charCodeAt(2) + code.charCodeAt(3)
index = hash % WORDS.length
word = WORDS[index]
```
**Rationale**: Simple, deterministic, different rooms get different words (unless sum of char codes collide, which is acceptable for 5-word list).
**Verification**: AC-US2-02 — same room code always yields same word.

## File-Level Plan

### Phase A — Backend Model & Logic

| File | Change | Requirements |
|------|--------|--------------|
| `backend/src/models/game.ts` | Add `drawerId` and `secretWord` to `Room`. Add `drawerId` to `RoomSnapshot`. | FR-003, FR-006, FR-007 |
| `backend/src/services/roomStore.ts` | Extend `startGame()`: trim all names, reject empty, assign `drawerId = hostId`, select word via deterministic hash. Fix `toRoomSnapshot()` to use `viewerParticipantId` — include `secretWord` only when viewer is the drawer. | FR-001, FR-002, FR-003, FR-005, FR-006, FR-007, FR-008, FR-009 |
| `backend/src/api/rooms.ts` | Update `PATCH /:code/start` handler to include `secretWord` in response for the drawer. Update `GET /:code` to pass `participantId` to `toRoomSnapshot`. | FR-006, FR-007 |

### Phase B — Frontend Types & State

| File | Change | Requirements |
|------|--------|--------------|
| `frontend/src/services/api.ts` | Add `drawerId` to `RoomSnapshot`. Add optional `secretWord` to response types. | FR-003, FR-006 |
| `frontend/src/state/roomStore.ts` | Add `isDrawer` (computed from `participantId === room.drawerId`). Add `secretWord` to state. Store `secretWord` from responses. | FR-003, FR-006, FR-007 |

### Phase C — Frontend UI

| File | Change | Requirements |
|------|--------|--------------|
| `frontend/src/pages/GamePage.tsx` | If `isDrawer`: show "You are the drawer" badge + display `secretWord`. If not drawer: show neutral game view, no word visible. | FR-004, FR-006, FR-007 |
| `frontend/src/pages/LobbyPage.tsx` | After successful start, pass role info to GamePage navigation. Show name validation errors from start endpoint. | FR-001, FR-002 |

## Testing Strategy

### Unit Tests (backend)

| Test | What It Verifies | Req. |
|------|------------------|------|
| `startGame` trims all participant names before processing | FR-001 |
| `startGame` rejects if any trimmed name is empty → 400 | FR-002 |
| `startGame` sets `drawerId = hostId` | FR-003 |
| `startGame` selects word deterministically from starter list | FR-005, FR-009 |
| Same room code always yields same word | FR-005 |
| `toRoomSnapshot` includes `secretWord` when viewer is drawer | FR-006 |
| `toRoomSnapshot` excludes `secretWord` when viewer is not drawer | FR-007 |
| Room status transitions from "lobby" to "playing" on success | FR-008 |

### Unit Tests (frontend)

| Test | What It Verifies | Req. |
|------|------------------|------|
| `isDrawer` computed correctly when participantId matches | FR-003 |
| `isDrawer` is false when participantId does not match | FR-007 |
| `secretWord` stored only when present in response | FR-006 |

### Integration Tests (backend)

| Test | What It Verifies | Req. |
|------|------------------|------|
| Full game start flow: create → join → start → verify drawer assignment and word | FR-001–FR-009 |
| Drawer and guesser get different snapshots from same room | FR-006, FR-007 |

### E2E / Manual Tests (two browser tabs)

| Verification | Req. / AC |
|-------------|-----------|
| Tab A (host) starts game → sees "You are the drawer" + secret word | AC-US1-01, AC-US1-03, AC-US2-01 |
| Tab B (guesser) → sees no secret word, no drawer badge | AC-US3-01 |
| Tab A starts game with empty-name player → error, stays in lobby | AC-US1-02, EC-01, EC-02, EC-03 |
| Tab A starts same room twice → same word both times | AC-US2-02 |
| 2-player game: host = drawer, other = guesser | SC-005 |

## Complexity Tracking

> No Constitution violations detected. Changes extend existing files (add fields, activate filtering in `toRoomSnapshot`).

## Requirement Traceability Map

| Req. | Plan Coverage |
|------|---------------|
| FR-001 — Name Trimming | Phase A (roomStore.startGame trim), Tests |
| FR-002 — Empty Name Rejection | Phase A (startGame validation), Phase C (LobbyPage error display), Tests |
| FR-003 — Drawer Assignment | State Model (Room.drawerId), Phase A (startGame assigns hostId), Phase B (frontend isDrawer), Tests |
| FR-004 — Drawer Visual ID | Phase C (GamePage: "You are the drawer" badge) |
| FR-005 — Deterministic Word Selection | Data Flow (hash algorithm), Phase A, Tests |
| FR-006 — Word Visible to Drawer | Data Flow (per-viewer snapshot), Phase B+C, Tests |
| FR-007 — Word Hidden from Guessers | Data Flow (snapshot filtering), Phase B+C, Tests |
| FR-008 — Status Transition | Phase A (startGame sets status = "playing"), Tests |
| FR-009 — Word Source | Phase A (starter list only), Tests |
| SC-001 | E2E validation (Tab A sees word + badge within 3s) |
| SC-002 | E2E validation (Tab B no word visible) |
| SC-003 | E2E validation (same room, same word) |
| SC-004 | E2E validation (empty name → error) |
| SC-005 | E2E validation (2-player roles correct) |
