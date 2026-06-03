# Tasks: Round End & Restart

**Input**: Design documents from `specs/004-round-end-restart/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Core unit tests are included in Phase 6; E2E validation is manual via quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown reflect the monorepo structure from the implementation plan

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify that the development environment is ready.

- [X] T001 Verify backend and frontend dev servers start successfully (`cd backend && npm run dev`, `cd frontend && npm run dev`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type extensions and infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `"reveal"` to `RoomStatus` union type in `backend/src/models/game.ts`
- [X] T003 Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts` to include `secretWord` for all viewers when `status === "reveal"` (FG3 restricted it to drawer only during `"playing"`)
- [X] T004 [P] Add `endRoundSchema` (participantId only) to `backend/src/api/schemas.ts`
- [X] T005 [P] Update frontend `RoomSnapshot` interface to include `"reveal"` in status type in `frontend/src/services/api.ts`
- [X] T006 [P] Add `endRound()` and `restartGame()` methods to the frontend `api` object in `frontend/src/services/api.ts`
- [X] T007 Add `endRound`, `restartGame` actions and reveal/restart state handling to `RoomStore` class in `frontend/src/state/roomStore.ts` (including polling-based navigation triggers for status changes)
- [X] T008 Add `/result` route to `frontend/src/routes/index.tsx` pointing to `ResultPage`

**Checkpoint**: Foundation ready — "reveal" status exists on both ends, API methods are callable, frontend can detect status changes via polling.

---

## Phase 3: User Story 1 — All Players See Result Screen When Round Ends (Priority: P1) 🎯 MVP

**Goal**: When the round ends (host manually or all guessers correct), all players see a result screen showing the secret word, final scores, and complete guess history.

**Independent Test**: Two players finish a round (host clicks "End Round"). Both see the same result screen with the correct word, identical scores, and identical guess history within 3 seconds. A player who never submitted a guess sees the result normally with score 0.

### Backend — Round End

- [X] T009 [P] [US1] Implement `endRound()` in `backend/src/services/roomStore.ts` that validates the requester is the host, sets `room.status` to `"reveal"`, and returns the updated room
- [X] T010 [US1] Implement auto-detect all-correct round end: in the guess submission logic of `backend/src/services/roomStore.ts`, after a correct guess, check if all non-drawer participants have guessed correctly and auto-transition to `"reveal"` status
- [X] T011 [P] [US1] Add `POST /rooms/:code/end-round` route in `backend/src/api/rooms.ts` (host-only, validates with endRoundSchema)

### Frontend — Result Screen

- [X] T012 [P] [US1] Create `WordReveal` component in `frontend/src/components/WordReveal.tsx` that displays the secret word prominently on the result screen
- [X] T013 [P] [US1] Create `ResultHistory` component in `frontend/src/components/ResultHistory.tsx` that renders the complete guess history (guesser name, guess text, correct/incorrect indicator, score awarded) in chronological order
- [X] T014 [US1] Create `ResultPage` in `frontend/src/pages/ResultPage.tsx` that composes `WordReveal`, `Scoreboard`, and `ResultHistory` to show the full result screen; redirects to lobby if room status is not `"reveal"`
- [X] T015 [US1] Add "End Round" button to `GamePage` in `frontend/src/pages/GamePage.tsx` — visible only to the host during active gameplay; calls `roomStore.endRound()` on click
- [X] T016 [US1] Implement automatic navigation from `GamePage`/`LobbyPage` to `ResultPage` when polling detects `status === "reveal"` in `frontend/src/state/roomStore.ts`

**Checkpoint**: Result screen works end-to-end — host clicks "End Round", both players see result with word, scores, and history. Auto-detect works when all guessers guess correctly.

---

## Phase 4: User Story 2 — Host Restarts the Game From Result Screen (Priority: P1)

**Goal**: From the result screen, the host can restart. All players return to the lobby together. Players are preserved. Round state is cleared.

**Independent Test**: After a round ends, the host clicks "Play Again." All players return to the lobby within 3 seconds. The player list is identical. No stale round data is visible (no word, strokes, guesses, scores, drawer). Non-host does not see a "Play Again" button.

### Backend — Restart

- [X] T017 [US2] Implement `restartGame()` in `backend/src/services/roomStore.ts` that validates the requester is the host, clears round fields (`secretWord`, `strokes`, `guesses`, `scores`, `drawerId`), and sets status to `"lobby"`
- [X] T018 [P] [US2] Add `POST /rooms/:code/restart` route in `backend/src/api/rooms.ts` (host-only, validates with endRoundSchema)

### Frontend — Restart UI

- [X] T019 [US2] Add "Play Again" button to `ResultPage` in `frontend/src/pages/ResultPage.tsx` — visible only to the host; calls `roomStore.restartGame()` on click. Non-host players see "Waiting for host to restart..." message instead.
- [X] T020 [US2] Implement automatic navigation from `ResultPage` to `LobbyPage` when polling detects `status === "lobby"` in `frontend/src/state/roomStore.ts`
- [X] T021 [US2] Verify `LobbyPage` in `frontend/src/pages/LobbyPage.tsx` correctly displays the preserved player list and allows the host to start a new game after restart

**Checkpoint**: Full loop working — round ends → result screen → host restarts → lobby with preserved players → host starts new game.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Guards, edge cases, and final validation.

- [X] T022 [P] Add non-host guard: reject `POST /rooms/:code/end-round` and `POST /rooms/:code/restart` when the requester is not the host in `backend/src/api/rooms.ts` (403 response)
- [X] T023 Add reveal status lock: reject drawing and guessing actions when `room.status === "reveal"` in `backend/src/services/roomStore.ts`
- [X] T024 Add restart idempotency guard: return current room state (no-op) if restart is called when status is already `"lobby"` in `backend/src/services/roomStore.ts`
- [X] T025 Handle rapid restart clicks on frontend: disable the "Play Again" button immediately on click in `frontend/src/pages/ResultPage.tsx`
- [ ] T026 Run `quickstart.md` validation steps to confirm all acceptance criteria pass across two browser tabs
- [X] T027 Verify TypeScript compilation on both backend and frontend (`npx tsc --noEmit` in each)

**Checkpoint**: All acceptance criteria from spec.md verifiable. Guards working. Edge cases handled.

---

## Phase 6: Automated Tests

**Purpose**: Unit tests covering core validation and state transition logic.

- [X] T028 Write unit test for `endRound()`: host validation, state transition to `"reveal"`, rejection when round not active
- [X] T029 Write unit test for `restartGame()`: host validation, state clear, idempotency guard
- [X] T030 Write unit test for reveal status lock: drawing and guessing rejected when `status === "reveal"`
- [X] T031 Write unit test for auto-end-round: all guessers correct triggers transition to `"reveal"`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion; also depends on US1 (ResultPage must exist before the restart button can be added)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational — Depends on US1 (restart button is on ResultPage, which is created in US1)

### Within Each User Story

- Backend endpoints before frontend components
- Core components before integration
- Story complete before moving to next

### Parallel Opportunities

- All Phase 2 tasks marked [P] can run in parallel (T002, T004, T005, T006)
- Within US1: T009 (endRound service) and T011 (endpoint) and T012/T013 (components) can run in parallel
- Within US1: T012 (WordReveal) and T013 (ResultHistory) can run in parallel
- Within US2: T018 (endpoint) is independent from T019/T020 (frontend)
- Within Polish: T022 can run in parallel with T025

---

## Parallel Example: User Story 1

```bash
# Launch backend tasks in parallel:
Task: "Implement endRound() in backend/src/services/roomStore.ts"
Task: "Add POST /rooms/:code/end-round route in backend/src/api/rooms.ts"

# Launch frontend components in parallel:
Task: "Create WordReveal component in frontend/src/components/WordReveal.tsx"
Task: "Create ResultHistory component in frontend/src/components/ResultHistory.tsx"
```

## Parallel Example: User Story 2

```bash
# Backend and frontend can proceed independently:
Task: "Add POST /rooms/:code/restart route in backend/src/api/rooms.ts"
Task: "Add Play Again button to ResultPage in frontend/src/pages/ResultPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Result Screen)
4. **STOP and VALIDATE**: Two tabs — host ends round, both see result with word, scores, history
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Result Screen) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Restart) → Test independently → Deploy/Demo
4. Add Polish (Guards, edge cases) → Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Result screen — backend + frontend)
   - Developer B: User Story 2 (Restart — backend + frontend) — can start after US1 frontend is ready
3. Final polish and guards by either developer

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US2 depends on US1 (restart button lives on ResultPage)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
