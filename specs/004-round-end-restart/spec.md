# Feature Specification: Round End & Restart

**Feature Branch**: `004-round-end-restart`

**Created**: 2026-06-02

**Status**: Draft

**Input**: Feature Group 4 — Round end reveal screen, host restart, player preservation, round state reset.

## User Scenarios & Testing

### User Story 1 — All Players See Result Screen When Round Ends (Priority: P1)

When the round ends, all players see a results screen that displays the secret word, final scores for all participants, and the complete guess history from the round.

**Why this priority**: The result screen is the natural conclusion of gameplay and the only way players learn the answer and see who won. Without it, the game has no closure.

**Independent Test**: Two players finish a round. Both players see the same result screen showing the correct word, the same scores, and the same guess history.

**Acceptance Scenarios**:

1. **AC-US1-01**: **Given** a round has ended in a room with multiple players, **When** any player views their screen, **Then** they see a result/reveal screen showing the correct secret word.
2. **AC-US1-02**: **Given** a round has ended, **When** any player views the result screen, **Then** they see the final scores for all participants.
3. **AC-US1-03**: **Given** a round has ended, **When** any player views the result screen, **Then** they see the complete guess history (all guesses, correct/incorrect status, and scores), ordered chronologically.
4. **AC-US1-04**: **Given** a round has ended, **When** two different players view their screens, **Then** they see identical information (same word, same scores, same guess history).
5. **AC-US1-05**: **Given** a round has ended with multiple guessers, **When** the result screen is displayed, **Then** the scores shown include the cumulative totals for all participants (e.g., 0 for the drawer, 100 for a correct guesser).
6. **AC-US1-06**: **Given** a round has ended where a player never submitted a guess, **When** the result screen is displayed, **Then** that player sees the result screen normally with their score shown as 0.

---

### User Story 2 — Host Restarts the Game From Result Screen (Priority: P1)

From the result screen, the host can trigger a restart. All current players return to the lobby together. The round state (secret word, strokes, guesses, scores) is cleared. Players are not removed.

**Why this priority**: The restart flow is essential for repeated play. Without it, every game would require creating a new room and re-inviting players.

**Independent Test**: After a round ends, the host clicks "Play Again." All players in the room are returned to the lobby screen within 3 seconds. The player list is preserved. No stale round data (strokes, guesses, scores, previous word) is visible.

**Acceptance Scenarios**:

1. **AC-US2-01**: **Given** the host is viewing the result screen after a round, **When** they click a "Play Again" or "Restart" button, **Then** all players in the room return to the lobby screen.
2. **AC-US2-02**: **Given** all players have returned to the lobby after a restart, **When** any player views the player list, **Then** all players from the previous round are still present (no player was removed).
3. **AC-US2-03**: **Given** all players have returned to the lobby after a restart, **When** any player views the room, **Then** the round-related state (secret word, strokes, guesses, scores, drawer assignment) is cleared and only lobby-appropriate information is visible.
4. **AC-US2-04**: **Given** a round has ended, **When** a non-host player attempts to restart, **Then** the restart action is denied and only the host can trigger it.
5. **AC-US2-05**: **Given** a non-host player is viewing the result screen, **When** the host triggers a restart, **Then** the non-host player is automatically transitioned to the lobby along with the host (synchronized restart).
6. **AC-US2-06**: **Given** the host has restarted the game and all players are in the lobby, **When** the host clicks "Start Game" again, **Then** a new round begins normally (drawer assigned, word selected, canvas available).
7. **AC-US2-07**: **Given** a room with a single player (host) after a round ends, **When** the host clicks "Play Again," **Then** they return to the lobby alone and can wait for others to join.

### Edge Cases

- **EC-01 — Host disconnects during result screen**: If the host leaves or disconnects while on the result screen, the remaining players see the result screen but cannot restart. A new host may need to be assigned or the room becomes stuck.
- **EC-02 — Player joins during result screen**: If a new player joins the room while the result screen is displayed, they see the result screen (word, scores, history) along with existing players.
- **EC-03 — Player disconnects during restart**: If a player disconnects between the host clicking restart and the lobby transition, they do not reappear in the lobby. Their spot is lost.
- **EC-04 — Multiple restart clicks**: If the host clicks "Play Again" multiple times rapidly, only one restart occurs. Players are not duplicated or re-added.
- **EC-05 — Restart from lobby after restart**: After returning to the lobby, a standard game start proceeds as normal — the room is in the same state as a freshly created lobby, except with existing players.
- **EC-06 — Restart during mid-round (not result screen)**: Restart is only available from the result screen. There is no mid-round restart.

## Requirements

### Functional Requirements

- **FR-001 — Round End Transition**: When the round ends (host triggers end or all guessers have guessed correctly), the room MUST transition from playing state to a reveal state where the result screen is shown to all players.
- **FR-002 — Secret Word Reveal**: The correct secret word MUST be displayed to ALL players on the result screen (not just the drawer).
- **FR-003 — Score Display**: The result screen MUST display final cumulative scores for every participant in the room.
- **FR-004 — Guess History Display**: The result screen MUST display the complete guess history (guesser name, guess text, correct/incorrect, score awarded) in chronological order.
- **FR-005 — Result Synchronization**: All players MUST see identical result data (same word, same scores, same guess history) at the same point in time.
- **FR-006 — Host-Only Restart**: Only the host MAY trigger a restart from the result screen. Non-host players MUST NOT have this ability.
- **FR-007 — Player Preservation on Restart**: When a restart is triggered, ALL current participants MUST remain in the room. No player is removed or kicked.
- **FR-008 — Round State Clear**: On restart, the following round-specific state MUST be cleared: secret word, strokes, guesses, scores, drawer assignment.
- **FR-009 — Lobby Return**: On restart, ALL players MUST be returned to the lobby state. The room code and player list remain intact.
- **FR-010 — Synchronized Restart**: When the host restarts, ALL connected players MUST transition to the lobby automatically without requiring individual action.
- **FR-011 — Restart Idempotency**: Multiple rapid clicks of the restart button MUST NOT cause duplicate effects (duplicate lobby entries, duplicate room state).
- **FR-012 — New Game After Restart**: After restart, the host MUST be able to start a new game from the lobby, which operates identically to the initial game start (drawer assigned, word selected).
- **FR-013 — Round End Trigger — Host Manual**: The host MUST be able to manually end the active round at any time, transitioning all players to the result screen.
- **FR-014 — Round End Trigger — All Correct**: The round MUST automatically end when all guessers have submitted a correct guess.
- **FR-015 — Reveal Status Lock**: While in the reveal state, round-specific actions (drawing, guessing) MUST be rejected.

### Key Entities

- **Room**: Represents the game session. Extended with a reveal state that shows results before restart. Players, room code, and host identity survive restart.
- **Result Screen**: A read-only view presented to all players after the round ends. Contains the secret word, scores, and guess history.
- **Round State**: The ephemeral data associated with a single round (secret word, strokes, guesses, scores, drawer). This is cleared on restart.
- **Host**: The player who controls game lifecycle — can start the game, end the round, and restart after reveal.

## Success Criteria

### Measurable Outcomes

- **SC-001**: After a round ends, all players see the result screen with the correct word, scores, and guess history within 3 seconds.
- **SC-002**: Two players in the same room see identical result screen data (same word, scores, history, order) at all times.
- **SC-003**: When the host clicks "Play Again," all players transition to the lobby within 3 seconds.
- **SC-004**: After restart, the lobby shows all players from the previous round (no player loss).
- **SC-005**: After restart, round-specific data (word, strokes, guesses, scores) is no longer visible to any player.
- **SC-006**: A non-host player cannot trigger a restart from the result screen.
- **SC-007**: After restart, the host can start a new game that functions identically to the first game.
- **SC-008**: The host can manually end a round at any point and all players see the result screen.

## Assumptions

- **A-001 — Round End Trigger**: The round ends either when the host manually clicks "End Round" or when all guessers have submitted a correct guess. No automatic timer is used (timers are out of scope).
- **A-002 — Host Identity**: The host is the player who created the room (FG1). Host identity is preserved across restart.
- **A-003 — Single Round**: Only one round exists at a time. The result screen reflects the single completed round.
- **A-004 — Synchronous Transitions**: All players poll the room state and transition to new screens based on the room status changing. There is no push notification — players discover the new state on their next poll.
- **A-005 — Player Join During Reveal**: New players who join during the reveal phase see the result screen. They are treated as existing participants after restart.
- **A-006 — No Autoplay**: There is no automatic "next round" — the host must manually restart. This prevents accidental progression.
- **A-007 — Restart Destination**: Restart returns players to the same lobby (same room code), not to the home screen or a new room.
