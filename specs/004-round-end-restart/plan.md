# Implementation Plan: Round End & Restart

**Branch**: `assignment` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-round-end-restart/spec.md`

## Summary

Add a round-end reveal screen showing the secret word, scores, and guess history to all players. The host can restart the game from the reveal screen, returning all players to the lobby with preserved participants but cleared round state. All transitions use HTTP polling (no WebSockets).

## Technical Context

**Language/Version**: TypeScript 5.6, Node 24.13

**Primary Dependencies**: Express 4.21 (backend), React 18 (frontend), Zod 3.23 (backend)

**Storage**: In-memory `Map<string, Room>`. Round state cleared on restart. No persistence.

**Testing**: Vitest (backend: node env, frontend: jsdom env)

**Target Platform**: Modern browsers

**Project Type**: Web application — Express REST backend + React SPA frontend

**Performance Goals**: Result screen visible to all players within ~3s of round end. Restart transition to lobby within ~3s.

**Constraints**: No WebSockets — all state transitions discovered via HTTP polling. No databases. No auth. No real-time push.

**Scale/Scope**: 2–6 simultaneous players, single round per game, host-initiated restart.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Review Discipline**: spec.md exists and was created before this plan → PASS
- **Out of Scope Enforcement**: No WebSockets (polling for result + restart), no databases, no auth, no multiple rounds, no timers, no spectator mode — only reveal + restart flow → PASS
- **Testing Principles**: Test strategy covers result visibility (word, scores, history for all), restart behavior (players preserved, state cleared), multi-room isolation, and validation (non-host cannot restart) → PASS
- **Engineering Principles** (Extend, Don't Rewrite): Adds `"reveal"` status to existing Room, extends RoomSnapshot with reveal fields, creates new frontend ResultPage component. No starter code rewritten. No new backend files. → PASS

## Project Structure

### Documentation (this feature)

```text
specs/004-round-end-restart/
├── plan.md              # This file
├── research.md          # Phase 0 — architecture decisions
├── data-model.md        # Phase 1 — entity definitions
├── quickstart.md        # Phase 1 — setup instructions
├── contracts/           # Phase 1 — API contract definitions
│   └── api.md
├── spec.md              # Feature specification
└── tasks.md             # Phase 2 — task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/src/
├── models/
│   └── game.ts                     # ✎ Add "reveal" to RoomStatus; extend Room with hostId
├── services/
│   └── roomStore.ts               # ✎ Add endRound, restartGame, getResultData
├── api/
│   ├── rooms.ts                    # ✎ Add POST end-round, POST restart endpoints
│   └── schemas.ts                  # ✎ Add endRoundSchema
├── app.ts                          # No changes
└── server.ts                       # No changes

frontend/src/
├── services/
│   └── api.ts                      # ✎ Add endRound, restartGame API methods
├── state/
│   └── roomStore.ts                # ✎ Add reveal/restart state, endRound/restart actions
├── pages/
│   ├── GamePage.tsx                # ✎ Add "End Round" button (host); transition to/from reveal
│   └── ResultPage.tsx              # ★ NEW result/reveal screen with word, scores, history, restart button
├── components/
│   ├── WordReveal.tsx              # ★ NEW reveals secret word to all players
│   └── ResultHistory.tsx           # ★ NEW displays guess history in result context
├── routes/
│   └── index.tsx                    # ✎ Add /result route
└── app.css                          # ✎ Add result page styles (if needed)
```

**Structure Decision**: Standard monorepo pattern. Backend extends existing Room model with `"reveal"` status. Frontend adds a new `ResultPage` for the reveal view and modifies `GamePage` to add the "End Round" trigger for the host. Restart transitions all players back to the existing `LobbyPage`.

## Data Flow

### Round End (Host Manual)
```
Active round is in "playing" status
  → Host clicks "End Round"
  → POST /rooms/:code/end-round { participantId: hostId }
  → Backend validates host identity
  → Backend sets room.status = "reveal"
  → All clients poll GET /rooms/:code
  → detect status === "reveal"
  → Frontend navigates to ResultPage
```

### Round End (All Correct — Auto)
```
All guessers have submitted correct guesses
  → On the last correct guess submission, backend detects all-guessed
  → Backend sets room.status = "reveal"
  → Same polling/navigation flow as manual end
```

### Result Screen Display
```
All players on ResultPage
  → Poll GET /rooms/:code
  → RoomSnapshot includes:
      secretWord: string          // revealed to ALL players now
      scores: Record<string, number>
      guesses: Guess[]
      status: "reveal"
  → Frontend renders WordReveal, ResultHistory, Scoreboard
  → Host sees "Play Again" button
  → Non-hosts see "Waiting for host..." message
```

### Restart
```
Host clicks "Play Again" on ResultPage
  → POST /rooms/:code/restart { participantId: hostId }
  → Backend validates host identity
  → Backend clears: secretWord, strokes, guesses, scores, drawerId
  → Backend sets room.status = "lobby"
  → All clients poll GET /rooms/:code
  → detect status === "lobby"
  → Frontend navigates to LobbyPage
  → Player list is unchanged
```

## State Model

### Backend Types (`backend/src/models/game.ts`)

**RoomStatus** (extended):
```typescript
type RoomStatus = "lobby" | "playing" | "reveal"    // ★ NEW: "reveal"
```

**Room** (extended from FG1/FG2/FG3):
```typescript
Room {
  code: string
  status: RoomStatus
  participants: Participant[]
  hostId: string                // ★ NEW (or from FG3) — player who created room
  drawerId: string | null       // from FG3
  secretWord: string | null     // from FG3 — revealed to all when status=reveal
  strokes: Stroke[]             // from FG3
  guesses: Guess[]              // from FG3
  scores: Record<string, number> // from FG3
  createdAt: string
  updatedAt: string
}
```

**RoomSnapshot** (extended):
```typescript
RoomSnapshot {
  code: string
  status: RoomStatus
  participants: Participant[]
  hostId: string
  drawerId: string | null
  secretWord: string | null     // ★ visible to ALL when status=reveal (FG3: only to drawer)
  strokes: Stroke[]
  guesses: Guess[]
  scores: Record<string, number>
  availableWords: string[]
  roles: string[]
}
```

### Frontend Types

**RoomSnapshot** (matched to backend):
```typescript
RoomSnapshot {
  code: string
  status: "lobby" | "playing" | "reveal"
  participants: Participant[]
  hostId: string
  drawerId: string | null
  secretWord: string | null
  strokes: Stroke[]
  guesses: Guess[]
  scores: Record<string, number>
  availableWords: string[]
  roles: string[]
}
```

### Frontend State (`frontend/src/state/roomStore.ts`)

```typescript
RoomState {
  room: RoomSnapshot | null
  participantId: string | null
  error: string | null
  isLoading: boolean
  // Actions (new):
  async endRound(): Promise<void>
  async restartGame(): Promise<void>
}
```

### State Transitions

```
Room Status:
  [lobby] ──(start game)──→ [playing]
  [playing] ──(end round / all correct)──→ [reveal]
  [reveal] ──(host restarts)──→ [lobby]

Frontend Pages:
  LobbyPage ──→ GamePage ──→ ResultPage ──→ LobbyPage
```

## Complexity Tracking

> No Constitution violations detected. Changes are additive: one new status value, one new endpoint, one new frontend page. No new dependencies, no rewrites.

## Requirement Traceability Map

| Req. | Plan Coverage |
|------|---------------|
| FR-001 — Round End Transition | Data Flow (POST end-round → status="reveal") |
| FR-002 — Secret Word Reveal | State Model (secretWord visible to all in snapshot) |
| FR-003 — Score Display | State Model (scores in RoomSnapshot), Data Flow (ResultPage renders scores) |
| FR-004 — Guess History Display | State Model (guesses in RoomSnapshot), Data Flow (ResultPage renders history) |
| FR-005 — Result Synchronization | Data Flow (all clients poll same RoomSnapshot → identical data) |
| FR-006 — Host-Only Restart | Data Flow (POST restart validates hostId) |
| FR-007 — Player Preservation | Data Flow (restart clears round fields, keeps participants) |
| FR-008 — Round State Clear | Data Flow (restart clears secretWord, strokes, guesses, scores, drawerId) |
| FR-009 — Lobby Return | Data Flow (restart → status="lobby" → navigate to LobbyPage) |
| FR-010 — Synchronized Restart | Data Flow (all clients detect status="lobby" via polling) |
| FR-011 — Restart Idempotency | Backend checks status already "lobby" before processing |
| FR-012 — New Game After Restart | Data Flow (lobby with players preserved, host can start new game) |
| FR-013 — Host Manual End Round | Data Flow (POST end-round with host validation) |
| FR-014 — Auto-End All Correct | Data Flow (detected on last correct guess submission) |
| FR-015 — Reveal Status Lock | Backend rejects draw/guess actions when status="reveal" |
| SC-001 | E2E: result visible within 3s of end |
| SC-002 | E2E: two players see identical result |
| SC-003 | E2E: restart transition within 3s |
| SC-004 | E2E: lobby shows all players after restart |
| SC-005 | E2E: round data cleared after restart |
| SC-006 | E2E: non-host cannot restart |
| SC-007 | E2E: new game after restart works |
| SC-008 | E2E: host ends round → all see result |
