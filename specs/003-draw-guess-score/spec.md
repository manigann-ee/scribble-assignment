# Feature Specification: Draw, Guess & Score

**Feature Branch**: `003-draw-guess-score`

**Created**: 2026-06-02

**Status**: Draft

**Input**: Feature Group 3 — Drawing, guessing, scoring, guess history, and canvas management during an active round.

## User Scenarios & Testing

### User Story 1 — Drawer Draws on Canvas, All Players See It (Priority: P1)

The drawer uses the canvas to illustrate the secret word. Their strokes appear on all players' screens. The drawer can clear the canvas and start over.

**Why this priority**: Drawing is the core mechanic. Without visible strokes, guessers have no information to work with.

**Independent Test**: The drawer draws a line on the canvas. All other players in the room see the same line appear on their screens. The drawer can clear the canvas and confirm it is blank for all players.

**Acceptance Scenarios**:

1. **AC-US1-01**: **Given** an active round with a drawer and guessers, **When** the drawer draws a stroke on the canvas, **Then** the stroke appears on the canvases of all players (including guessers) within a reasonable time.
2. **AC-US1-02**: **Given** the drawer has drawn on the canvas, **When** they click "Clear Canvas", **Then** the canvas is cleared for all players — no strokes remain visible to anyone.
3. **AC-US1-03**: **Given** an active round, **When** a guesser views the canvas area while the drawer has drawn nothing, **Then** the guesser sees a blank canvas (no stale or pre-existing strokes).

---

### User Story 2 — Guessers Submit Guesses, Scoring Is Deterministic (Priority: P1)

Guessers type guesses which are validated (trimmed, non-empty) and matched case-insensitively against the secret word. Correct guesses score exactly 100 points. All guesses and scores appear in a shared history visible to all players.

**Why this priority**: Guessing and scoring are the other half of gameplay. Without them, the round has no objective or outcome.

**Independent Test**: A guesser submits a guess. If it matches the secret word (case-insensitive, after trim), they score 100 points and the correct guess appears in the shared history. If it does not match, it appears in the history with 0 points.

**Acceptance Scenarios**:

1. **AC-US2-01**: **Given** an active round with a secret word "rocket", **When** a guesser submits the guess "  Rocket  ", **Then** the guess is trimmed to "Rocket", matched case-insensitively to "rocket", recorded as a correct guess, and the guesser's score increases by 100.
2. **AC-US2-02**: **Given** an active round with a secret word "rocket", **When** a guesser submits a guess that does not match after trimming and case-folding (e.g., "spaceship"), **Then** the guess is recorded as incorrect and the guesser's score does not change (0 points).
3. **AC-US2-03**: **Given** an active round, **When** a guesser submits a guess consisting only of whitespace (e.g., "   "), **Then** the guess is rejected with a clear error ("Guess cannot be empty") and is not recorded in the history.
4. **AC-US2-04**: **Given** an active round, **When** a guesser submits an empty string as a guess, **Then** the guess is rejected with a clear error ("Guess cannot be empty") and is not recorded in the history.
5. **AC-US2-05**: **Given** an active round, **When** a guesser submits a guess "ROCKET" (all caps) and the secret word is "rocket", **Then** the guess is matched as correct (case-insensitive matching) and scores 100 points.
6. **AC-US2-06**: **Given** an active round where guesser Alice submitted "rocket" (correct) and guesser Bob has submitted "pizza" (incorrect), **When** any player views the guess history, **Then** they see both guesses with their scores (Alice: 100, Bob: 0) and the guess history is identical for all viewers.
7. **AC-US2-07**: **Given** two guessers in the same round, **When** both submit the correct word, **Then** each guesser who submitted the correct word earns 100 points (correct guesses are not exclusive — multiple players can score).
8. **AC-US2-08: Failure case — network error on guess submission**: **Given** a guesser submits a guess, **When** the submission fails due to a network error, **Then** the guess is not recorded, the guesser's score is not changed, and the guesser sees an error message ("Guess could not be submitted — please try again").
9. **AC-US2-09: Failure case — network error on guess history**: **Given** players are viewing an active round, **When** the guess history fails to load due to a network error, **Then** the history area shows an appropriate message (not crash) and retries automatically.
10. **AC-US2-10**: **Given** a guesser has already submitted the correct word in the current round, **When** they submit the correct word again, **Then** the duplicate guess is recorded in the history but the guesser earns 0 points (score does not increase).

---

### Edge Cases

- **EC-01 — Whitespace-only guess**: A guess consisting entirely of spaces, tabs, or other whitespace is rejected as empty after trimming.
- **EC-02 — Extremely long guess**: A guess exceeding a reasonable length (e.g., 100 characters) is rejected with an error message without sending to the server.
- **EC-03 — Case-insensitive exact match**: The guess "ROCKET", "Rocket", "rocket" all match the secret word "rocket". Case folding is applied to both the guess and the secret word before comparison.
- **EC-04 — Partial match is not correct**: A guess that contains the secret word as a substring (e.g., "my rocket ship" when the word is "rocket") does NOT count as correct — only exact match after normalization.
- **EC-05 — Multiple correct guessers**: Two guessers who both submit the correct word independently each score 100 points. Scoring is per-guesser, not first-come-first-served.
- **EC-06 — Drawer submits a guess**: If the drawer submits a guess, it is processed like any other guess (trimmed, validated, matched). The drawer earns points if correct, though in practice the drawer already knows the word.
- **EC-07 — Clearing an already-clear canvas**: If the drawer clicks "Clear Canvas" when the canvas is already blank, no error occurs — the canvas remains blank.
- **EC-08 — Guess after the round ends**: If a guesser submits a guess after the round has ended, the submission is rejected ("Round is over") and not recorded.
- **EC-09 — Duplicate correct guesses by same player**: If the same guesser submits the correct word multiple times, only the first correct guess earns points. Subsequent correct submissions are recorded in history but award 0 points.

### Validation Rules

- **VR-01 — Guess trimming**: All guesses MUST have leading and trailing whitespace removed before validation and comparison.
- **VR-02 — Empty guess rejection**: A guess that is empty or whitespace-only after trimming MUST be rejected with an error message. The guess MUST NOT be recorded in history.
- **VR-03 — Length check**: A guess exceeding 100 characters after trimming MUST be rejected with an error message before being sent to the server.
- **VR-04 — Case-insensitive match**: Guess matching MUST apply Unicode case folding to both the guess and the secret word before equality comparison.
- **VR-05 — Exact match required**: A guess is correct only if, after trimming and case-folding, it is an exact string match of the secret word. Substring or partial matches are incorrect.
- **VR-06 — Multiple correct guesses by same player**: If the same guesser has already guessed the correct word in the current round, subsequent correct guesses by that player earn 0 points (only the first correct guess per player per round scores).
- **VR-07 — Round active check**: A guess MUST only be accepted while the round status is active. Guesses submitted after the round ends are rejected.

## Requirements

### Functional Requirements

- **FR-001 — Drawing Visibility**: The drawer's strokes on the canvas MUST be visible to all participants in the room, including guessers.
- **FR-002 — Clear Canvas**: The drawer MUST be able to clear the canvas. When cleared, the canvas MUST appear blank to all participants.
- **FR-003 — Guess Trimming**: All guesses MUST be trimmed of leading and trailing whitespace before further processing.
- **FR-004 — Empty Guess Rejection**: A guess that is empty or whitespace-only after trimming MUST be rejected. The guesser MUST see a clear error message.
- **FR-005 — Case-Insensitive Matching**: Guess correctness MUST be determined by case-insensitive exact string comparison between the normalized guess and the secret word.
- **FR-006 — Guess History**: All guesses (correct and incorrect) MUST be recorded in a shared guess history visible to all participants.
- **FR-007 — Guess History Synchronization**: The guess history MUST be identical for all viewers. All participants see the same guesses in the same order.
- **FR-008 — Scoring**: A correct guess MUST award exactly 100 points. An incorrect guess MUST award 0 points.
- **FR-009 — Scoring Determinism**: Scoring MUST be deterministic — the same guess against the same secret word always produces the same score.
- **FR-010 — Per-Guesser Scoring**: Each guesser's score MUST be tracked independently. A correct guess by one guesser does not affect another guesser's score.
- **FR-011 — First Correct Guess Only**: If a guesser submits multiple correct guesses in the same round, only the first correct guess earns points. Subsequent correct guesses by the same player earn 0 points.
- **FR-012 — Guess History Ordering**: The guess history MUST be ordered chronologically (oldest first). New guesses are appended to the end.

### Key Entities

- **Room**: Extends from FG1/FG2 with drawing state, guess history, scores, and round status.
- **Canvas**: A shared drawing surface. Stroke data is synced to all participants. The drawer controls the canvas.
- **Stroke**: A single drawing action (e.g., a line). Collected into stroke sequences that represent the full drawing.
- **Guess**: A text submission by a guesser. Has a normalized value (trimmed), a correctness flag, a score, and a timestamp.
- **Guess History**: An ordered list of all guesses in the round, visible to all participants. Each entry contains: guesser ID, display name, guess text, correctness, score.
- **Score**: A numeric value per participant. Starts at 0. Incremented by 100 for each first-correct guess per round.
- **Secret Word**: Inherited from FG2. The word the drawer illustrates and guessers must match.

## Success Criteria

### Measurable Outcomes

- **SC-001**: When the drawer draws a line on the canvas, the line appears on all guessers' screens within 3 seconds.
- **SC-002**: When the drawer clears the canvas, the canvas appears blank on all players' screens within 3 seconds.
- **SC-003**: A guesser who types a correct word (any casing, with extra spaces) sees it recorded as correct with 100 points in the guess history within 2 seconds of submission.
- **SC-004**: A guesser who types an incorrect word sees it recorded with 0 points in the guess history within 2 seconds.
- **SC-005**: An empty or whitespace-only guess is rejected with a clear error message within 1 second, and no entry is added to the guess history.
- **SC-006**: Two guessers in the same room see the identical guess history (same entries, same order, same scores) at all times.
- **SC-007**: In a round with the secret word "rocket", all of these guesses are accepted as correct: "rocket", "ROCKET", "Rocket", "  rocket  ".
- **SC-008**: A guesser who submits the correct word twice in the same round earns exactly 100 points total (not 200).

## Assumptions

- **A-001 — Drawing via Polling**: Drawing stroke data is synced to all participants using HTTP polling (not WebSockets), consistent with the project constraint. The drawing is transmitted as stroke data and rendered by each client.
- **A-002 — Drawer Controls Canvas**: Only the drawer can clear or draw on the canvas. Guessers have a read-only view of the canvas. This prevents vandalism or interference.
- **A-003 — Drawer Does Not Score via Guessing**: The drawer knows the secret word and does not earn points for guessing. However, if the drawer submits a guess through the UI, it is processed normally (FR-006 covers all guesses).
- **A-004 — Exact Match Required**: A guess is correct only when, after trimming and case-folding, it is an exact string match of the secret word. Substring matches, plural forms, synonyms, and typo-tolerant matching are not supported.
- **A-005 — Chronological Guess Order**: The guess history is maintained in chronological order (oldest first), matching the order in which guesses are accepted by the server.
- **A-006 — Scores Persist Per-Room**: Scores are tracked per participant within the room session and are lost when the server restarts (in-memory only).
- **A-007 — Multiple Correct Guessers**: All guessers who submit the correct word (and have not previously guessed it correctly in this round) earn 100 points independently. There is no "first correct wins" mechanic.
- **A-008 — Guess Limit**: There is no limit on the number of guesses a player can submit, other than the 100-character length check.

## Out of Scope

The following items are explicitly out of scope for this feature group:

- WebSockets or real-time push protocols (polling only)
- Databases or persistent storage (in-memory only)
- Authentication or user accounts
- Multiple rounds or round cycling (single round per game)
- Timer or countdown for drawing or guessing
- Canvas drawing tools beyond basic strokes (brush size, colors, shapes, undo, redo)
- Image upload or external drawing tools
- Typo-tolerant or fuzzy string matching
- Hint system or word reveal
- Spectator mode
- Leaderboard or cross-room scoring
- Animations or sound effects
