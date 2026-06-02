# Tasks: Room Setup & Lobby

**Input**: Design documents from `specs/001-room-setup-lobby/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Included — testing and validation tasks are explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Dependencies, requirement mappings, and completion evidence are listed per task

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project initialization needed — backend and frontend are already scaffolded. Skip directly to foundational work.

No tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend model and service changes that ALL user stories depend on. Must complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tasks

- [ ] T001 [US1] [US2] [US4] Add `hostId: string` to `Room` and `RoomSnapshot` in `backend/src/models/game.ts`. Expand `RoomStatus` to `"lobby" | "playing"`.
  - **Depends On**: None
  - **Requirements**: FR-002, FR-010
  - **Completion Evidence**: `Room` type compiles with `hostId` field. `RoomStatus` accepts `"playing"`. Existing tests still pass.

- [ ] T002 [US1] [US2] [US4] Set `hostId` in `createRoom()` in `backend/src/services/roomStore.ts`. Add `startGame(code, participantId)` with host validation (must match `room.hostId`) and player-count validation (must be >= 2). Add `transferHost(room)` that reassigns host to earliest-joined remaining participant. Add player name trimming (whitespace → "Player" default).
  - **Depends On**: T001
  - **Requirements**: FR-002, FR-010, FR-011, FR-012, FR-013
  - **Completion Evidence**: `roomStore.createRoom` sets `hostId`. `startGame` returns room with status `"playing"` or throws appropriate errors. `transferHost` reassigns correctly. Name trimming works.

- [ ] T003 [P] [US4] Add `startGameSchema` (participantId required) in `backend/src/api/schemas.ts`. Tighten `playerName` validation in create/join schemas: accepted as optional string, trimmed, default "Player" on empty.
  - **Depends On**: None (parallel with T002)
  - **Requirements**: FR-010, FR-013
  - **Completion Evidence**: `startGameSchema` validates `{ participantId: string }`. Create/join schemas trim names and default to "Player".

- [ ] T004 [US4] Add `PATCH /:code/start` route handler in `backend/src/api/rooms.ts`. Call `startGame()` from roomStore, return updated room snapshot with status `"playing"`. Map errors to HTTP responses (403, 400, 404).
  - **Depends On**: T002, T003
  - **Requirements**: FR-010, FR-011
  - **Completion Evidence**: Sending `PATCH /rooms/ABCD/start` with non-host participantId returns 403. With <2 players returns 400. With valid host + ≥2 players returns 200 with `status: "playing"`.

- [ ] T005 [P] [US1] [US2] [US4] Write/update backend unit tests for foundational changes in `backend/src/services/roomStore.test.ts`:
  - `createRoom` sets `hostId` equal to creator's participant ID
  - `createRoom` assigns "Player" when name is empty/whitespace
  - `joinRoom` allows duplicate display names
  - `startGame` fails if requester is not host (403)
  - `startGame` fails if < 2 participants (400)
  - `startGame` succeeds when host + ≥2 participants
  - `transferHost` reassigns host when current host leaves
  - Room A operations do not affect Room B (isolation)
  - **Depends On**: T001, T002
  - **Requirements**: FR-002, FR-008, FR-010, FR-011, FR-012, FR-013, FR-014
  - **Completion Evidence**: `npm test` passes all new tests in backend.

**Checkpoint**: Foundation ready — backend supports host tracking, player name validation, start-game logic, and host transfer. All backend unit tests pass.

---

## Phase 3: User Story 1 — Player Creates a Room (Priority: P1) 🎯 MVP

**Goal**: A player can create a room and is automatically designated as the host. The lobby shows the room code and the host badge.

**Independent Test**: Open the app, enter a name, click "Create Room". You see a lobby with your name and a "Host" badge. A unique 4-character room code is displayed.

### Tasks

- [ ] T006 [P] [US1] Add `hostId: string` to the `RoomSnapshot` interface in `frontend/src/services/api.ts`. Update the type to match the backend's expanded `RoomSnapshot`.
  - **Depends On**: T001 (model change exists)
  - **Requirements**: FR-002
  - **Completion Evidence**: `RoomSnapshot` type includes `hostId`. Frontend compiles without type errors.

- [ ] T007 [P] [US1] Add `isHost: boolean` to `RoomState` in `frontend/src/state/roomStore.ts`. Compute as `participantId === room.hostId`. Expose via `useRoomState()`.
  - **Depends On**: T006
  - **Requirements**: FR-002
  - **Completion Evidence**: After creating a room, `useRoomState().isHost` is `true`. State updates when `room.hostId` changes.

- [ ] T008 [US1] Add integration test for full create-room flow in `backend/src/services/roomStore.test.ts`: create room → verify hostId matches participantId → verify room code is 4-char unique.
  - **Depends On**: T001, T002
  - **Requirements**: FR-001, FR-002, FR-004
  - **Completion Evidence**: Test passes: creates room, hostId = creator, code format correct.

- [ ] T009 [US1] E2E validation: Open browser, navigate to `/`, click "Create Room", enter name, submit. Confirm redirect to `/lobby` showing room code badge and your name listed.
  - **Depends On**: T006, T007
  - **Requirements**: FR-001, FR-002, SC-001
  - **Completion Evidence**: Manual verification — room code visible, name listed, page title shows "Lobby".

**Checkpoint**: US1 complete — a player can create a room and see the lobby with host status. MVP deliverable.

---

## Phase 4: User Story 2 — Player Joins a Room (Priority: P1)

**Goal**: A player can join an existing room by entering a valid code. Invalid/empty/whitespace codes are rejected with clear errors. Duplicate names are allowed.

**Independent Test**: Open a second browser tab, click "Join Room", enter the room code from the host's lobby, enter a name. You land in the lobby showing the host and yourself.

### Tasks

- [ ] T010 [P] [US2] Add client-side room code validation in `frontend/src/pages/JoinRoomPage.tsx`:
  - Reject empty code before API call — show "Room code is required"
  - Trim whitespace — if result is empty, reject with same error
  - Only send `POST /rooms/:code/join` if code is non-empty after trim
  - **Depends On**: T001 (model has code rules)
  - **Requirements**: FR-005, FR-006
  - **Completion Evidence**: Entering empty or whitespace-only code shows "Room code is required" immediately. No network request is sent for invalid codes.

- [ ] T011 [US2] Write frontend test for code validation in `frontend/src/services/api.test.ts`: verify empty/whitespace codes are rejected before fetch is called.
  - **Depends On**: T010
  - **Requirements**: FR-005, FR-006
  - **Completion Evidence**: Test verifies that `fetch` is NOT called for empty/whitespace inputs.

- [ ] T012 [US2] E2E validation — join room flows across two browser tabs:
  - Tab A creates room (from US1)
  - Tab B joins with valid code → sees both players in lobby
  - Tab B enters empty code → error, stays on Join screen
  - Tab B enters whitespace code → error, stays on Join screen
  - Tab B enters nonexistent code "ZZZZ" → "Room not found" error
  - Tab B joins with same name as Tab A → both accepted
  - **Depends On**: T009 (US1 E2E working), T010
  - **Requirements**: FR-003, FR-005, FR-006, FR-007, FR-014, EC-01, EC-02, EC-03, EC-04, SC-002
  - **Completion Evidence**: All 6 manual test cases pass in two browser tabs.

**Checkpoint**: US2 complete — players can join rooms with validation. Two-player rooms possible (needed for US4).

---

## Phase 5: User Story 3 — Lobby Polling Keeps Participants Synced (Priority: P1)

**Goal**: The lobby automatically polls the server at ~2s intervals so participants see new joiners and state changes without manual refresh.

**Independent Test**: Two browser tabs join the same room. When a third player joins in a separate tab, the first two tabs update within ~3s without manual refresh.

### Tasks

- [ ] T013 [P] [US3] Add `startPolling()` and `stopPolling()` methods to `RoomStore` class in `frontend/src/state/roomStore.ts`. Use `setInterval` at 2000ms calling `fetchRoom()`. Store interval ID for cleanup.
  - **Depends On**: T001 (GET endpoint returns hostId), T006 (frontend type)
  - **Requirements**: FR-009, NFR-001
  - **Completion Evidence**: `startPolling()` begins calling `fetchRoom()` every ~2s. `stopPolling()` clears the interval. `fetchRoom()` errors do not crash the store.

- [ ] T014 [US3] Wire polling into `LobbyPage` in `frontend/src/pages/LobbyPage.tsx`: add `useEffect` that calls `startPolling()` on mount and `stopPolling()` on unmount (cleanup function). Show error message when poll fails (without crashing).
  - **Depends On**: T013
  - **Requirements**: FR-009, NFR-002
  - **Completion Evidence**: LobbyPage calls `startPolling` on mount. Navigate away → polling stops (no console errors for cleanup). Poll failure shows message but continues retrying.

- [ ] T015 [P] [US3] Write frontend tests for polling in `frontend/src/state/roomStore.test.ts` (or new test file): verify `startPolling` sets interval, `stopPolling` clears it.
  - **Depends On**: T013
  - **Requirements**: NFR-001, NFR-002
  - **Completion Evidence**: `npm test` passes in frontend. Poll timer is managed correctly.

- [ ] T016 [US3] E2E validation — polling across two browser tabs:
  - Tab A creates room, lands on lobby
  - Tab B joins same room in separate tab
  - Tab A's participant list updates within ~3s WITHOUT clicking "Refresh Room"
  - Tab B sees both players listed
  - **Depends On**: T009 (US1 working), T012 (US2 working), T014
  - **Requirements**: FR-009, NFR-001, NFR-002, SC-005
  - **Completion Evidence**: Participant list auto-updates within ~3s. Manual "Refresh Room" button still works (graceful degradation).

**Checkpoint**: US3 complete — lobby syncs automatically. Players see each other without manual refresh.

---

## Phase 6: User Story 4 — Host Starts the Game (Priority: P1)

**Goal**: Only the host can start the game, and only when ≥2 players are in the lobby. Non-host players see the button disabled. Host transfer works on disconnect.

**Independent Test**: In a room with host + 1 other, only the host sees an enabled "Start Game". When host clicks it, both players transition to the Game screen. If host leaves, a new host is assigned.

### Tasks

- [ ] T017 [US4] Update `LobbyPage` in `frontend/src/pages/LobbyPage.tsx`:
  - Conditionally disable/hide "Start Game" button based on `isHost`
  - Conditionally disable button when `participants.length < 2`
  - On click, call `roomStore.startGame()`, then navigate to `/game` on success
  - Show appropriate error message if start fails (not host, not enough players)
  - **Depends On**: T007 (isHost computed), T004 (backend endpoint exists)
  - **Requirements**: FR-010, FR-011
  - **Completion Evidence**: Host sees enabled button only when ≥2 players. Non-host sees disabled/hidden button. Clicking start navigates to `/game`. Error displayed on failure.

- [ ] T018 [US4] Write frontend test for startGame API call in `frontend/src/services/api.test.ts`: verify `PATCH /rooms/:code/start` is called with correct body.
  - **Depends On**: T017
  - **Requirements**: FR-010
  - **Completion Evidence**: Test verifies API call shape matches contract.

- [ ] T019 [US4] Write backend integration test for full lobby-to-game flow in `backend/src/services/roomStore.test.ts` or new test file: create room → join room → start game → verify status = "playing".
  - **Depends On**: T001, T002, T003, T004
  - **Requirements**: FR-001, FR-002, FR-003, FR-010, FR-011
  - **Completion Evidence**: Full integration test passes end-to-end.

- [ ] T020 [US4] E2E validation — host-only start across two browser tabs:
  - Tab A (host) sees "Start Game" enabled when 2+ players in lobby
  - Tab A clicks "Start Game" → both tabs navigate to `/game`
  - Tab B (non-host) sees "Start Game" disabled/hidden
  - Tab A alone (only 1 player) → "Start Game" disabled
  - **Depends On**: T017, T016 (polling)
  - **Requirements**: FR-010, FR-011, SC-003, SC-004, AC-US4-01, AC-US4-02, AC-US4-03
  - **Completion Evidence**: All 4 manual test cases pass in two browser tabs.

- [ ] T021 [US4] E2E validation — host transfer:
  - Tab A (host) and Tab B (non-host) in lobby
  - Tab A closes browser (simulate disconnect)
  - Tab B sees on next poll that they are now the host (isHost = true)
  - Tab B sees "Start Game" enabled
  - **Depends On**: T002 (transferHost), T016 (polling), T017 (UI)
  - **Requirements**: FR-012, AC-US4-04, EC-06
  - **Completion Evidence**: Host transfers correctly. Remaining player can start the game.

**Checkpoint**: US4 complete — host-only start, 2-player minimum, and host transfer all work. Feature group fully implemented.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation updates, and edge case hardening.

- [ ] T022 [P] Run `cd backend && npm test` and `cd frontend && npm test` — all tests must pass.
  - **Depends On**: T005, T008, T011, T015, T018, T019
  - **Requirements**: All
  - **Completion Evidence**: Both backend and frontend test suites pass.

- [ ] T023 Run full E2E validation from quickstart.md — two browser tabs completing the full lobby flow.
  - **Depends On**: T022
  - **Requirements**: SC-001 through SC-006
  - **Completion Evidence**: All 10 manual verification scenarios from plan.md pass.

- [ ] T024 Update AGENTS.md active plan references if any file paths changed during implementation.
  - **Depends On**: T022
  - **Requirements**: Traceability (constitution)
  - **Completion Evidence**: AGENTS.md references match actual file paths.

- [ ] T025 [P] Code review pass: verify no debug logs, no commented-out code, no out-of-scope features (WebSockets, databases, auth), no new dependencies added.
  - **Depends On**: T022
  - **Requirements**: NFR-004, NFR-005, constitution compliance
  - **Completion Evidence**: Review checklist complete. No scope violations found.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup): None — skip (already scaffolded)
       ↓
Phase 2 (Foundational): T001 → T002 → T004
                         T001 → T003 → T004
                         T002 → T005
       ↓
Phase 3 (US1): T001 → T006 → T007 → T009
               T001 → T002 → T008
       ↓
Phase 4 (US2): T001 → T010 → T011 → T012
       ↓
Phase 5 (US3): T001 → T006 → T013 → T014 → T016
               T013 → T015
       ↓
Phase 6 (US4): T004 + T007 → T017 → T020
               T017 → T018
               T001→T004 → T019
               T002 → T021
       ↓
Phase 7 (Polish): T005+T008+T011+T015+T018+T019 → T022 → T023
                                                 T022 → T024
                                                 T022 → T025
```

### User Story Dependencies

- **US1 (Create Room)**: Depends on Phase 2 (T001, T002). Independent of US2/US3/US4.
- **US2 (Join Room)**: Depends on Phase 2 (T001). Independent of US1/US3/US4 at the backend level. Frontend joins work with any existing room.
- **US3 (Lobby Polling)**: Depends on Phase 2 (T001) + T006 (frontend type). Independent of US1/US2 UI — polling works regardless of how players enter the room.
- **US4 (Host Start Game)**: Depends on Phase 2 (T001-T004) + US3 (polling for sync) + US1/US2 (room must have ≥2 players). Strongest dependency chain.

### Critical Path

```
T001 → T002 → T004 → T017 → T020 (longest chain for US4)
T001 → T006 → T007 → T017 (parallel path for frontend)
```

### Parallel Opportunities

| Phase | Parallel Tasks |
|-------|---------------|
| Phase 2 | T002 + T003 (different files: roomStore.ts + schemas.ts) |
| Phase 3 | T006 + T007 + T008 (api.ts, roomStore.ts, test) |
| Phase 6 | T018 + T019 (frontend test + backend integration test) |
| Phase 7 | T024 + T025 (docs + review, different concerns) |

### Parallel Example: Phase 3 (US1)

```bash
# Launch all US1 tasks together:
Task: "Add hostId to RoomSnapshot in frontend/src/services/api.ts"
Task: "Add isHost to RoomState in frontend/src/state/roomStore.ts"
Task: "Write backend test for createRoom hostId assignment"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 2: Foundational (backend model + store)
2. Complete Phase 3: US1 — Create Room (frontend types + host display)
3. Complete Phase 4: US2 — Join Room (code validation + E2E)
4. **STOP and VALIDATE**: Two browser tabs can create and join a room, see each other in lobby (with manual refresh)
5. This is the MVP — core room flow works

### Incremental Delivery

1. Foundational → Backend supports all stories
2. US1 + US2 → Two-player room creation and joining (MVP)
3. US3 → Lobby auto-syncs via polling (no manual refresh needed)
4. US4 → Host-only start with game transition (complete feature group)

### Implementation Order Within Each Phase

Tests → Models → Store → API → UI → Integration → E2E validation

---

## Summary

| Metric | Count |
|--------|-------|
| Total tasks | 25 |
| Phase 2 (Foundational) | 5 |
| Phase 3 (US1 — Create Room) | 4 |
| Phase 4 (US2 — Join Room) | 3 |
| Phase 5 (US3 — Lobby Polling) | 4 |
| Phase 6 (US4 — Host Start Game) | 5 |
| Phase 7 (Polish) | 4 |
| Parallelizable tasks | 10 |

### Requirement Coverage

| Requirement | Task(s) |
|-------------|---------|
| FR-001 — Room Creation | T001, T008 |
| FR-002 — Host Assignment | T001, T002, T005, T006, T007, T008, T019 |
| FR-003 — Join by Code | T012, T019 |
| FR-004 — Room Code Format | T008 |
| FR-005 — Empty Code Rejection | T010, T011, T012 |
| FR-006 — Whitespace Code Handling | T010, T011, T012 |
| FR-007 — Nonexistent Code Handling | T012 |
| FR-008 — Room Isolation | T005 |
| FR-009 — Lobby Polling | T013, T014, T016 |
| FR-010 — Host-Only Start Game | T001, T002, T003, T004, T017, T018, T019, T020 |
| FR-011 — Minimum Players to Start | T002, T004, T017, T019, T020 |
| FR-012 — Host Transfer | T002, T005, T021 |
| FR-013 — Player Name Default | T002, T003, T005 |
| FR-014 — Duplicate Names | T005, T012 |
| NFR-001 — Polling Cadence | T013, T015, T016 |
| NFR-002 — Polling Reliability | T014, T015, T016 |
| NFR-003 — Error Message Clarity | T010, T012, T017 (implied in UI strings) |
| SC-001 → SC-006 | T009, T012, T016, T020, T021, T023 |
