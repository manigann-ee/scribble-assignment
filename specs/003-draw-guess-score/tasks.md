# Tasks: Draw, Guess & Score

**Input**: Design documents from `specs/003-draw-guess-score/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Tests are NOT included in this task breakdown unless explicitly requested.

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

**Purpose**: Verify that the development environment is ready and both servers run correctly.

- [X] T001 Verify backend dev server starts successfully (`cd backend && npm run dev`)
- [X] T002 Verify frontend dev server starts successfully (`cd frontend && npm run dev`)
- [X] T003 Verify both servers can communicate (frontend polls backend for room status)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, model extensions, and schemas that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Add `Stroke`, `Point`, `Guess` interfaces in `backend/src/models/game.ts`
- [X] T005 Extend `Room` interface with `strokes`, `guesses`, `scores`, `drawerId`, `secretWord`, `hostId` fields in `backend/src/models/game.ts`
- [X] T006 Extend `RoomSnapshot` interface with `strokes`, `guesses`, `scores`, `drawerId`, `hostId` fields in `backend/src/models/game.ts`
- [X] T007 [P] Add `strokeSchema`, `clearCanvasSchema`, `guessSubmissionSchema` to `backend/src/api/schemas.ts`
- [X] T008 Implement `startGame()` in `backend/src/services/roomStore.ts` that sets status to "playing", assigns drawer, picks secret word, and initializes empty arrays
- [X] T009 Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts` to include strokes, guesses, scores, drawerId, hostId in the snapshot
- [X] T010 Add `POST /rooms/:code/start` endpoint in `backend/src/api/rooms.ts` for host to start the game
- [X] T011 [P] Add `Stroke`, `Point`, `Guess`, `Scores` types and extend `RoomSnapshot` in `frontend/src/services/api.ts`
- [X] T012 [P] Add `startGame()`, `addStroke()`, `clearCanvas()`, `submitGuess()` API methods to the frontend `api` object in `frontend/src/services/api.ts`
- [X] T013 Extend frontend `RoomState` with `strokes`, `guesses`, `scores`, `isDrawer`, `secretWord` fields and add a polling mechanism in `frontend/src/state/roomStore.ts`

**Checkpoint**: Foundation ready — types match on both ends, startGame works, RoomSnapshot includes all new fields, frontend can poll and store all new data.

---

## Phase 3: User Story 1 — Drawer Draws on Canvas, All Players See It (Priority: P1) 🎯 MVP

**Goal**: The drawer can draw strokes on a canvas and clear it. All players see the same strokes appear/disappear within ~3s via HTTP polling.

**Independent Test**: Open two browser tabs in the same room. Tab A (drawer) draws a line on the canvas — Tab B (guesser) sees the same line within 3s. Tab A clears the canvas — Tab B sees a blank canvas within 3s.

### Backend — Drawing Endpoints

- [X] T014 [US1] Implement `addStroke()` in `backend/src/services/roomStore.ts` that validates drawer identity, appends stroke to `room.strokes`, and returns the saved stroke
- [X] T015 [US1] Implement `clearCanvas()` in `backend/src/services/roomStore.ts` that validates drawer identity and empties `room.strokes`
- [X] T016 [P] [US1] Add `POST /rooms/:code/strokes` route in `backend/src/api/rooms.ts` (drawer-only, validates stroke data with schema)
- [X] T017 [P] [US1] Add `DELETE /rooms/:code/strokes` route in `backend/src/api/rooms.ts` (drawer-only, clears canvas)

### Frontend — Canvas Component

- [X] T018 [P] [US1] Create `Canvas.tsx` component in `frontend/src/components/Canvas.tsx` with drawing mode (mouse events: mousedown starts stroke, mousemove extends, mouseup finalizes) and display mode (read-only render of all strokes)
- [X] T019 [US1] Add stroke-related actions (`addStroke`, `clearCanvas`) and stroke polling to the `RoomStore` class in `frontend/src/state/roomStore.ts`
- [X] T020 [US1] Integrate `Canvas` component into `GamePage.tsx` in `frontend/src/pages/GamePage.tsx`, passing drawer/guesser mode and stroke data

**Checkpoint**: Drawing works end-to-end — drawer draws, guessers see strokes, clear works for all.

---

## Phase 4: User Story 2 — Guessers Submit Guesses, Scoring Is Deterministic (Priority: P1)

**Goal**: Guessers submit text guesses. Guesses are validated (trimmed, non-empty, length-checked, case-insensitive exact match). Correct guesses score 100. All guesses and scores appear in a shared history visible to all players.

**Independent Test**: In an active round, guesser submits "  Rocket  " — guess appears as correct with 100 points. Guesser submits "pizza" — guess appears as incorrect with 0 points. Both guessers see identical history. Guesser submits empty guess — error displayed, no history entry. Same guesser submits "rocket" twice — only first scores 100.

### Backend — Guessing & Scoring

- [X] T021 [US1] [US2] Add `startGame()` integration: ensure room transitions to "playing" with a valid `drawerId` and `secretWord` in `backend/src/services/roomStore.ts`
- [X] T022 [US2] Implement `submitGuess()` in `backend/src/services/roomStore.ts` with the full validation pipeline: trim → reject empty → reject >100 chars → case-fold → exact match → check duplicate correct → record with score (100 or 0)

### Frontend — Guess Components

- [X] T023 [P] [US2] Create `GuessInput.tsx` component in `frontend/src/components/GuessInput.tsx` with client-side validation (empty check, 100-char limit) and submission via store action
- [X] T024 [P] [US2] Create `GuessHistory.tsx` component in `frontend/src/components/GuessHistory.tsx` that renders the ordered list of guesses showing guesser name, text, correctness indicator, and score
- [X] T025 [US2] Update `Scoreboard.tsx` component in `frontend/src/components/Scoreboard.tsx` to render real scores from room state instead of placeholder
- [X] T026 [US2] Add guess submission action, history polling, and score syncing to the `RoomStore` class in `frontend/src/state/roomStore.ts`
- [X] T027 [US2] Integrate `GuessInput`, `GuessHistory`, and updated `Scoreboard` into `GamePage.tsx` in `frontend/src/pages/GamePage.tsx`, wiring guesses and scores from store

**Checkpoint**: Full game loop working — drawer draws, guessers see canvas, submit guesses, scores update, history is shared.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, error handling, and quickstart verification.

- [X] T028 [P] Add error handling for network failures on guess submission (AC-US2-08, AC-US2-09) in `frontend/src/state/roomStore.ts` and `frontend/src/components/GuessInput.tsx`
- [X] T029 [P] Add drawer guess guard (EC-06) — drawer's guesses are processed normally but they already know the word
- [X] T030 Add round-end guess rejection (EC-08) — reject guesses when status is not "playing"
- [ ] T031 Run `quickstart.md` validation steps to confirm all acceptance criteria pass across two browser tabs
- [X] T032 Verify TypeScript compilation on both backend and frontend (`npx tsc --noEmit` in each)

**Checkpoint**: All acceptance criteria from spec.md verifiable. Edge cases handled.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion; logically independent from US1
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational — No dependencies on other stories (guessing works independently of drawing)

### Within Each User Story

- Models before services
- Services before endpoints
- Frontend components after backend is ready
- Integration after components are ready

### Parallel Opportunities

- All Phase 2 tasks marked [P] can run in parallel
- US1 and US2 can be worked on in parallel by different developers (they touch different files)
- Within US1: T016 and T017 (POST and DELETE endpoints) can run in parallel
- Within US1: T018 (Canvas component) and T019 (store actions) can run in parallel
- Within US2: T023 (GuessInput) and T024 (GuessHistory) can run in parallel
- Within Polish: T028, T029, T030 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch backend endpoints in parallel:
Task: "Add POST /rooms/:code/strokes route in backend/src/api/rooms.ts"
Task: "Add DELETE /rooms/:code/strokes route in backend/src/api/rooms.ts"

# Launch frontend tasks in parallel:
Task: "Create Canvas.tsx component in frontend/src/components/Canvas.tsx"
Task: "Add stroke-related actions and polling to RoomStore in frontend/src/state/roomStore.ts"
```

## Parallel Example: User Story 2

```bash
# Launch frontend components in parallel:
Task: "Create GuessInput.tsx component in frontend/src/components/GuessInput.tsx"
Task: "Create GuessHistory.tsx component in frontend/src/components/GuessHistory.tsx"

# Backend and frontend can proceed independently:
Task: "Implement submitGuess() in backend/src/services/roomStore.ts"
Task: "Add guess actions and history polling to RoomStore in frontend/src/state/roomStore.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Drawing)
4. **STOP and VALIDATE**: Open two tabs — drawer draws, guesser sees strokes, clear works
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Drawing) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Guessing & Scoring) → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Drawing — Canvas, stroke endpoints)
   - Developer B: User Story 2 (Guessing — GuessInput, GuessHistory, guess endpoint)
3. Stories remain independently testable
4. Final integration and Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Drawing and Guessing stories are intentionally independent — US1 does not block US2 from being implemented
