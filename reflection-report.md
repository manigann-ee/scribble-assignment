# Reflection Report: Scribble Multiplayer Drawing Game

## 1. What the Starter App Already Had

The starter app was a minimal monorepo scaffold with:

- **Backend** (`backend/`): Express server skeleton with TypeScript, a basic Router setup, Zod schemas (`schemas.ts`), a `Room` model (`game.ts`), and an in-memory room store (`roomStore.ts`). It had no game logic — only `createRoom`, `joinRoom`, `getRoom`, and `toRoomSnapshot` existed as stubs.
- **Frontend** (`frontend/`): Vite + React 18 + React Router v6 scaffold with `RoomStoreProvider`, a polling-based room store (`roomStore.ts`), and an API client (`api.ts`). Only `StartPage`, `CreateRoomPage`, `JoinRoomPage`, and a basic `LobbyPage` existed. No game UI.
- **Testing**: Vitest configured for both sides with minimal test coverage (2 schema tests on backend, 0 roomStore tests).
- **Styling**: CSS custom properties, a panel/card system, a button system, a basic canvas placeholder, and responsive breakpoints in `app.css`.

## 2. What Was Added

Four feature groups were implemented incrementally:

| FG | Feature | Key Additions |
|----|---------|--------------|
| 1 | Room Setup & Lobby | `startGame()` logic, room code generation, hostId tracking, participant validation, LobbyPage UI with polling |
| 2 | Game Start & Drawer | Drawer assignment, `secretWord` selection from word list, deterministic word mapping by room code, role-based visibility |
| 3 | Draw, Guess & Score | `addStroke()`, `clearCanvas()`, `submitGuess()` with case-insensitive matching, duplicate detection, scoring (100pts for first correct), `GuessInput`, `GuessHistory`, `Canvas`, `Scoreboard` components |
| 4 | Round End & Restart | `endRound()`, `restartGame()`, auto-end when all correct, `ResultPage`, `WordReveal`, `ResultHistory`, "Play Again" flow, state clearance, player preservation |

**Files created**: `WordReveal.tsx`, `ResultHistory.tsx`, `ResultPage.tsx`, test expansions
**Files modified**: `game.ts`, `schemas.ts`, `roomStore.ts`, `rooms.ts`, `api.ts`, `roomStore.tsx`, `GamePage.tsx`, `routes/index.tsx`, `app.css`

**Test coverage**: 0 → 80 tests (61 backend + 19 frontend) across 4 feature groups.

## 3. Discovery Findings

- **Deterministic word selection**: Using a hash of the room code to pick the secret word means the same room always gets the same word. This was discovered to be useful for reproducibility but means word choice is not random across restarts.
- **Polling architecture limitations**: The 2-second polling interval means there is an inherent ~2s delay before clients detect status changes (lobby → playing, playing → reveal, reveal → lobby). This is acceptable for a drawing game but would not work for real-time applications.
- **Auto-end race condition**: The auto-end detection runs inside `submitGuess()`. When the last guesser submits correctly, the round transitions to `"reveal"` mid-request. Tests with only one guesser needed adjustment — the round would auto-end after their first correct guess, blocking duplicate guess tests.
- **Non-host error handling**: API-level errors (403, 400) return JSON bodies, not HTTP-thrown exceptions. The frontend `fetchRoom` polling silently catches errors to avoid crash loops.
- **Canvas coordinate system**: Using normalized coordinates (0-1 range) means canvas rendering is resolution-independent but requires recalculation on the frontend for actual pixel positions.

## 4. Assumptions Made

- **Host is always the drawer**: The first player (room creator) is both host and drawer by default. No drawer rotation was implemented since it was out of scope.
- **Single round only**: Only one round exists at a time. The result screen shows one completed round. No multi-round history.
- **No timer**: Round duration is unlimited. The host manually ends the round, or it auto-ends when all guessers guess correctly.
- **Starter word list**: The 5-word list (`rocket`, `pizza`, `castle`, `guitar`, `sunflower`) from the seed data is sufficient for the MVP. No word selection UI.
- **100 points per correct guess**: Flat scoring. No speed bonus, no penalty for incorrect guesses, no streak multiplier.
- **Display name uniqueness not required**: Multiple players can have the same display name. No validation against duplicates.
- **Participant order preserved**: Player list survives restart without reordering. Players stay in join order.
- **Browser refresh recovers state**: Polling `GET /rooms/:code` with `participantId` restores the UI to the correct page based on `room.status`.

## 5. AI Usage Process

The AI assistant (opencode/big-pickle) was used end-to-end:

1. **Spec reading**: Loaded and parsed all spec documents (spec.md, plan.md, data-model.md, contracts/api.md, tasks.md) for each feature group.
2. **Code reading**: Read all existing source files to understand patterns, types, imports, and conventions.
3. **Implementation**: Generated code edits across both backend and frontend, respecting existing patterns (TypeScript strict mode, Zod validation, React functional components, polling-based state management).
4. **Test adaptation**: Updated existing tests when auto-end logic changed behavior and added 16 new tests for FG4.
5. **Validation**: Ran TypeScript compilation checks (`tsc --noEmit`) and test suites (`vitest run`) after each phase. Ran end-to-end HTTP API validation against live server.
6. **Traceability**: Generated traceability matrix mapping requirements ↔ tests ↔ acceptance criteria.

## 6. Tradeoffs Considered

| Tradeoff | Chosen Approach | Alternative Considered |
|----------|----------------|----------------------|
| State sync mechanism | HTTP polling (2s interval) | WebSockets — rejected (out of scope per constitution) |
| Secret word storage | In-memory `Map<string, Room>` | Database — rejected (out of scope per constitution) |
| RoomCode generation | Human-readable (no 0/O, 1/I/L) | Pure alphanumeric — rejected (confusability) |
| Drawer assignment | Host is always drawer | Random/picking — rejected (simplicity for MVP) |
| Auto-end condition | All non-drawer participants correct | Timer-based — rejected (out of scope) |
| Result page navigation | Polling-based status detection | Redirect on API response — both used (response for host, polling for others) |
| Scoring model | 100 flat points per correct guess | Speed-based, proximity-based — rejected (simplicity) |
| Canvas coordinates | Normalized 0-1 range | Pixel-based — rejected (resolution independence) |
| Restart idempotency | Check `status !== "reveal"` | Idempotency key — rejected (simpler, sufficient) |

## 7. Challenges Encountered

- **Auto-end disrupting existing tests**: The new auto-end logic in `submitGuess()` broke 2 existing FG3 tests. In those tests, a single guesser getting the correct answer triggered the auto-end, preventing the duplicate guess test. Solution: added a second guesser to those tests so auto-end did not trigger prematurely.
- **Server process management**: The backend server would crash or be killed between E2E test runs. Using `nohup` with a dedicated log file and `pkill` cleanup resolved this.
- **Route registration confusion**: After editing `rooms.ts`, the server needed restarting. In-memory state was lost on restart, requiring fresh room creation for E2E tests.
- **Python piping fragility**: Early E2E attempts used `curl | python3` which broke on empty responses. Switching to a Node.js script with proper error handling resolved this.
- **Monorepo command coordination**: `npm run dev` starts both servers independently. The frontend needs `VITE_API_URL` pointing to the backend (default `localhost:3001`). Both must be running simultaneously for full-stack testing.

## 8. Validation Approach

Validation was multi-layered:

1. **Static analysis**: `npx tsc --noEmit` on both backend and frontend after every phase. Zero type errors throughout.
2. **Unit tests**: `npx vitest run` on both sides. 80 tests total (61 backend + 19 frontend), all passing.
3. **API E2E tests**: A Node.js script exercised the complete game lifecycle against the live backend:
   - Create room → join → start → draw → clear → wrong guess → correct guess → auto-end → verify reveal → restart → new game
   - Verified: status transitions, data visibility rules, host-only guards, state clearance, player preservation
4. **Out-of-scope verification**: Confirmed no WebSocket, database, or auth endpoints exist.
5. **Traceability matrix**: Each functional requirement (FR-001 to FR-015) mapped to at least one test and E2E assertion.

| Layer | Scope | Results |
|-------|-------|---------|
| TypeScript compilation | All source files | ✅ 0 errors |
| Backend unit tests | Store logic, schemas | ✅ 61/61 pass |
| Frontend unit tests | Store, API client | ✅ 19/19 pass |
| E2E HTTP API | Full lifecycle | ✅ 30+ assertions pass |

## 9. Why Out-of-Scope Features Were Excluded

The `.specify/memory/constitution.md` explicitly forbids three categories. These constraints were respected throughout:

| Excluded Feature | Reason | Impact of Adding |
|-----------------|--------|-----------------|
| **WebSockets / Socket.io** | Constitution forbids real-time push protocols. All sync uses HTTP polling. | Would reduce latency from 2s to near-zero but adds connection management, reconnection logic, and scaling complexity. |
| **Databases** | Constitution mandates in-memory storage only. No SQL, NoSQL, SQLite, or persistence layer. | Would enable game history, leaderboards, and crash recovery but adds infrastructure dependencies, migrations, and deployment complexity. |
| **Authentication** | Constitution forbids sessions, JWT, OAuth, or any identity system. Player identity is session-only via `participantId` UUID. | Would enable persistent usernames, friend lists, and security but adds signup/login flows, password management, and privacy compliance overhead. |
| **Timers** | Round timers were explicitly scoped out. Round ends manually or when all guessers are correct. | Would add auto-end countdown, UI timer display, and prevent stalled games but adds complexity to the MVP. |
| **Drawer rotation** | The host is always the drawer. No round-robin or random drawer selection. | Would make gameplay more varied but adds round tracking, drawer transition logic, and UI complexity. |

These exclusions were not accidental omissions — they were deliberate architectural decisions to keep the MVP focused, deployable without infrastructure, and testable in a single session.

## 10. Lessons Learned

1. **Test-first thinking prevents regressions**: The auto-end logic broke existing FG3 tests because those tests assumed `submitGuess` never changed room status. Writing tests before implementation would have caught this earlier.
2. **Polling is simple but has latency visibility**: The 2s polling interval means status changes propagate with a 0-2s delay. This is acceptable for a drawing game but must be documented as a known behavior, not a bug.
3. **Normalized coordinates simplify rendering**: Using 0-1 range for points means canvas resolution can change without backend changes. The frontend maps to actual pixel coordinates during rendering.
4. **Idempotency guards are cheap insurance**: The restart idempotency check (no-op if already in lobby) took one line but prevents a class of race conditions from rapid clicks.
5. **TypeScript strict mode prevents entire bug categories**: Union types for `RoomStatus` made it impossible to have an invalid status value. `null` vs `undefined` discipline in `toRoomSnapshot` prevented secretWord leaks.
6. **Curl-based E2E testing is fragile**: Python JSON parsing of curl output breaks on network errors. A proper Node.js test script with error handling is more maintainable.
7. **In-memory state means server restart = game reset**: This is fine for development but means production would need persistence. The constitution mandates in-memory only, so this is by design.
8. **Component composition with shared state works well**: `ResultPage` composes `WordReveal`, `Scoreboard`, and `ResultHistory` — each independently testable, all sharing the same `roomStore` state. This pattern prevented prop-drilling while maintaining testability.
