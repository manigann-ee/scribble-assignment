# Tasks: Game Start & Drawer Flow

**Input**: Design documents from `specs/002-game-start-drawer-flow/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `backend/src/`
- Frontend: `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define all shared types needed across user stories

- [X] T001 [P] Add `hostId: string`, `drawerId: string | null`, `secretWord: string | null` to `Room`. Add `hostId`, `drawerId` to `RoomSnapshot`. Expand `RoomStatus` to `"lobby" | "playing"` in `backend/src/models/game.ts`
- [X] T002 [P] Add `startGameSchema` with `participantId` validation in `backend/src/api/schemas.ts`
- [X] T003 [P] Update `RoomSnapshot` with `hostId`, `drawerId`. Add `RoomSessionResponse` with optional `secretWord` in `frontend/src/services/api.ts`

**Checkpoint**: All shared types defined across backend and frontend.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core room management that MUST be complete before any user story

- [X] T004 Implement `createRoom()` with `hostId` set to creator's participant ID. Implement `displayName()` trimming (empty/whitespace → "Player") in `backend/src/services/roomStore.ts`
- [X] T005 Implement `transferHost(room)` — reassign host to earliest-joined remaining participant in `backend/src/services/roomStore.ts`
- [X] T006 [P] Add `startPolling()` and `stopPolling()` methods to `RoomStore` — `setInterval` at 2000ms calling `fetchRoom()`, store interval ID for cleanup in `frontend/src/state/roomStore.ts`

**Checkpoint**: Room store foundation ready — user stories can now begin.

---

## Phase 3: User Story 1 — Host Starts the Game (Priority: P1) 🎯 MVP

**Goal**: The host, with 2+ players in lobby, can start the game. All names are validated (trimmed, non-empty), the drawer is assigned, a word is selected deterministically, and the room transitions to playing.

**Independent Test**: A host in a lobby with 2+ players clicks "Start Game". The game starts, the drawer is identified, and all players see the Game screen. If any player has an empty name, the start is rejected with an error.

### Implementation

- [X] T007 [US1] Implement `startGame(code, participantId)` — trim all names, reject if any empty, reject if not host, reject if <2 participants, set `drawerId = hostId`, select word via deterministic hash (`sum(charCodes) % words.length`), set `status = "playing"`, return updated room in `backend/src/services/roomStore.ts`
- [X] T008 [US1] Add `PATCH /:code/start` route — call `startGame()`, map errors to 403 (not host), 400 (not enough players / empty names), 404 (room not found) in `backend/src/api/rooms.ts`
- [X] T009 [US1] Add `startGame(code, participantId)` method to API client in `frontend/src/services/api.ts`
- [X] T010 [US1] Add `isHost` (computed: `participantId === room.hostId`), `startGame()` (calls API, updates room state) to `RoomStore` in `frontend/src/state/roomStore.ts`
- [X] T011 [US1] Update `LobbyPage.tsx` — wire polling (mount: `startPolling()`, unmount: `stopPolling()`), conditional "Start Game" button (enabled only when `isHost` and `participants.length >= 2`), on click call `store.startGame()` and navigate to `/game`, show error messages, show "Host" badge next to host participant

**Checkpoint**: Game can be started. Lobby fully functional with polling, host controls, and name validation.

---

## Phase 4: User Story 2 — Drawer Sees the Secret Word (Priority: P1)

**Goal**: When the game starts, the drawer is shown the secret word prominently. The word is delivered by the backend only to the drawer's client.

**Independent Test**: After the game starts, the drawer sees "You are the drawer" badge and the secret word displayed. A guesser opening dev tools or checking network traffic cannot see the word.

### Implementation

- [X] T012 [US2] Update `toRoomSnapshot(room, viewerParticipantId)` — include `secretWord` in a response wrapper only when `viewerParticipantId === room.drawerId`. Return `RoomSessionResponse` shape in `backend/src/services/roomStore.ts`
- [X] T013 [US2] Update `GET /:code` handler — pass `participantId` query param to `toRoomSnapshot()`, return `RoomSessionResponse` shape in `backend/src/api/rooms.ts`
- [X] T014 [P] [US2] Add `isDrawer` (computed: `participantId === room.drawerId`) and `secretWord` (stored from response, null for guessers) to `RoomState` in `frontend/src/state/roomStore.ts`
- [X] T015 [US2] Update `GamePage.tsx` — if `isDrawer`: show "You are the drawer" badge prominently and display `secretWord` (e.g., "Draw this: rocket")

**Checkpoint**: Drawer sees badge + word. Backend enforces word visibility per role.

---

## Phase 5: User Story 3 — Word Hidden from Guessers (Priority: P1)

**Goal**: Guessers must not see the secret word anywhere on their screen. The game view is clean and neutral for non-drawers.

**Independent Test**: After the game starts, a guesser views the Game screen. No word is visible in any UI element. The canvas area shows neutral text.

### Implementation

- [X] T016 [US3] Update `GamePage.tsx` — if not drawer: show neutral game view with no word visible. Handle the case where `room.status` is still "lobby" (redirect to lobby). Display "Waiting for drawing..." or similar neutral text in the canvas area.

**Checkpoint**: Guesser sees no word. All per-role visibility requirements satisfied.

---

## Phase 6: Polish & Validation

**Purpose**: Verify all functionality with tests and manual validation

- [X] T017 [P] Write backend unit tests — `createRoom` sets `hostId`, `createRoom` defaults empty name to "Player", `startGame` fails if not host (403), fails if <2 participants (400), fails if any name empty (400), succeeds with valid inputs and sets status to "playing", assigns `drawerId = hostId`, selects word deterministically, `transferHost` reassigns to earliest remaining, `toRoomSnapshot` includes word for drawer and excludes for guesser, room isolation in `backend/src/**/*.test.ts`
- [X] T018 [P] Write backend integration tests — full flow: create → join → start → verify room status, drawerId, secretWord; drawer and guesser get different responses from same room in `backend/src/**/*.test.ts`
- [X] T019 [P] Write frontend unit tests — `api.startGame` sends correct PATCH, `api.fetchRoom` sends participantId param, `isHost`/`isDrawer` computed correctly, `secretWord` stored only when present, polling starts/stops in `frontend/src/**/*.test.ts`
- [X] T020 Manual E2E validation across two browser tabs — host starts game and sees badge + word, guesser sees no word, empty-name rejection, same room restarted yields same word, host disconnect transfers host

**Checkpoint**: All tests pass. E2E scenarios verified.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup): T001 → T004, T005
                 T002 → T008 (needs schema)
                 T003 → T006, T014
      ↓
Phase 2 (Foundational): T004 → T007 (startGame needs createRoom)
                        T005 → standalone
                        T006 → T011 (polling needed by lobby)
      ↓
Phase 3 (US1):  T007 → T008 → T009 → T010 → T011
      ↓
Phase 4 (US2):  T012 → T013
                T012 → T014 [P] (different files, response shape known)
                T014 → T015
      ↓
Phase 5 (US3):  T015, T016 → independent (different view conditions)
      ↓
Phase 6 (Tests): T017, T018, T019 [P] (different test files)
                 T020 depends on all implementation tasks
```

### Critical Path

```
T001 → T004 → T007 → T008 → T009 → T010 → T011 → T015 → T016 (backend → lobby → game)
T001 → T003 → T014 (types → state)
T012 → T013 → T020 (per-viewer filtering)
```

### Parallel Opportunities

| Phase | Parallel Tasks |
|-------|---------------|
| Phase 1 | T001, T002, T003 (different files, no deps) |
| Phase 2 | T004 (with T005 sequentially), T006 (frontend separate) |
| Phase 4 | T014 with T013 (frontend state vs API handler) |
| Phase 6 | T017, T018, T019 (different test suites) |

---

## Parallel Example: Phase 1 Setup

```bash
# All three setup tasks can run in parallel:
Task: "T001: Add hostId, drawerId, secretWord to types in backend/src/models/game.ts"
Task: "T002: Add startGameSchema in backend/src/api/schemas.ts"
Task: "T003: Update RoomSnapshot types in frontend/src/services/api.ts"
```

## Parallel Example: Phase 6 Tests

```bash
# All three test suites can run in parallel:
Task: "T017: Backend unit tests for roomStore.ts"
Task: "T018: Backend integration tests"
Task: "T019: Frontend unit tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → all types defined
2. Complete Phase 2: Foundational → room CRUD works
3. Complete Phase 3: User Story 1 → game can start
4. **STOP and VALIDATE**: Test US1 independently — host starts game, drawer assigned, room transitions to playing
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → room management ready
2. Add User Story 1 (Host Starts Game) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Drawer Sees Word) → Test independently → Deploy/Demo
4. Add User Story 3 (Word Hidden) → Test independently → Deploy/Demo
5. Add Polish/Validation → full quality gate pass

### Per-Story Validation

- **After Phase 3 (US1)**: Open two tabs, create and join, host clicks Start → both see Game screen, host is drawer
- **After Phase 4 (US2)**: Drawer tab shows "You are the drawer" + secret word
- **After Phase 5 (US3)**: Guesser tab shows game screen with NO secret word visible anywhere
- **After Phase 6**: `cd backend && npm test` passes, `cd frontend && npm test` passes, manual E2E verified

---

## Summary

| Metric | Count |
|--------|-------|
| Total tasks | 20 |
| Phase 1 (Setup) | 3 |
| Phase 2 (Foundational) | 3 |
| Phase 3 (US1 — Host Starts Game) | 5 |
| Phase 4 (US2 — Drawer Sees Word) | 4 |
| Phase 5 (US3 — Word Hidden) | 1 |
| Phase 6 (Polish & Validation) | 4 |
| Parallelizable | 7 |

### Requirement Coverage

| Requirement | Task(s) |
|-------------|---------|
| FR-001 — Name Trimming (FG2) | T007, T011 |
| FR-002 — Empty Name Rejection (FG2) | T007, T011 |
| FR-003 — Drawer Assignment (FG2) | T001, T007, T010, T014 |
| FR-004 — Drawer Visual ID (FG2) | T015 |
| FR-005 — Deterministic Word (FG2) | T001, T007 |
| FR-006 — Word Visible to Drawer (FG2) | T012, T013, T014, T015 |
| FR-007 — Word Hidden from Guessers (FG2) | T012, T013, T016 |
| FR-008 — Status Transition (FG2) | T001, T007 |
| FR-009 — Word Source (FG2) | T007 |
| FR-002 — Host Assignment (FG1) | T001, T004 |
| FR-009 — Lobby Polling (FG1) | T006, T011 |
| FR-010 — Host-Only Start (FG1) | T002, T007, T008, T009, T010, T011 |
| FR-011 — Min Players to Start (FG1) | T007, T008, T011 |
| FR-012 — Host Transfer (FG1) | T005 |
| FR-013 — Player Name Default (FG1) | T004 |

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
