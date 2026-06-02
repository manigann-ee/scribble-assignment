# Feature Specification: Game Start & Drawer Flow

**Feature Branch**: `002-game-start-drawer-flow`

**Created**: 2026-06-02

**Status**: Draft

**Input**: Feature Group 2 — Game start, drawer assignment, word selection, and per-role word visibility.

## User Scenarios & Testing

### User Story 1 — Host Starts the Game (Priority: P1)

A host clicks "Start Game" in the lobby. The system validates all player names (trimmed, non-empty), assigns the drawer role to the host, selects a word deterministically, and transitions the room to playing state. All players see the game screen.

**Why this priority**: This is the entry point for all gameplay. Without it, no round can begin.

**Independent Test**: A host in a lobby with 2+ players clicks "Start Game". The game starts, the drawer is identified, and the game screen appears for all players.

**Acceptance Scenarios**:

1. **AC-US1-01**: **Given** a lobby with 2+ players where all names are non-empty, **When** the host clicks "Start Game", **Then** the game starts, the room status becomes "playing", and all players see the Game screen.
2. **AC-US1-02**: **Given** a lobby with a player whose name is empty or whitespace-only after trimming, **When** the host clicks "Start Game", **Then** the start is rejected with a clear message ("All players must have a name"), and the room stays in the lobby.
3. **AC-US1-03**: **Given** the host starts the game, **When** the first round begins, **Then** the host is assigned as the drawer, and the drawer role is clearly indicated on their screen.

---

### User Story 2 — Drawer Sees the Secret Word (Priority: P1)

When the game starts, the drawer is shown the secret word selected from the starter list. The word is displayed prominently so the drawer can begin drawing.

**Why this priority**: Without seeing the word, the drawer cannot draw. This is the core mechanic of the game.

**Independent Test**: After the game starts, the drawer sees a word displayed on their Game screen. The word is one of the starter words.

**Acceptance Scenarios**:

1. **AC-US2-01**: **Given** the game has started and the drawer role has been assigned, **When** the drawer views the Game screen, **Then** they see the secret word displayed (e.g., "Draw this: rocket").
2. **AC-US2-02**: **Given** the game has started with a specific room code, **When** the drawer views their word, **Then** the word is deterministically selected (same room code always yields the same word).

---

### User Story 3 — Guessers Cannot See the Secret Word (Priority: P1)

Guessers playing the game must not see the secret word. The word is hidden from everyone except the drawer, preserving the guessing challenge.

**Why this priority**: Word secrecy is essential to fair gameplay. If guessers see the word, the game is broken.

**Independent Test**: After the game starts, a non-drawer (guesser) opens the Game screen. No secret word is visible. The canvas area shows "Waiting for drawing..." or similar neutral text.

**Acceptance Scenarios**:

1. **AC-US3-01**: **Given** the game has started and a guesser is viewing the Game screen, **When** they look at the UI, **Then** no secret word is visible anywhere on their screen.

---

### Edge Cases

- **EC-01 — All players have empty names**: If every player in the lobby has an empty/whitespace-only name, the host cannot start the game. All names are rejected.
- **EC-02 — Mixed valid and invalid names**: If some players have valid names and others have empty/whitespace names, the start is rejected. All players must have non-empty names after trim.
- **EC-03 — Name with only whitespace**: A name consisting only of spaces/tabs is treated as empty after trimming, and rejected.
- **EC-04 — Drawer leaves during game start**: If the host/drawer disconnects at the exact moment of game start, the remaining players see the game start but with no drawer. The host transfer mechanism (from Feature Group 1) should have already handled this at the lobby level.
- **EC-05 — Room with exactly 2 players**: The minimum viable game. The host is the drawer, the other player is the guesser. The host sees the word; the guesser does not.
- **EC-06 — Word list is fixed**: The word is selected deterministically from the starter list `["rocket", "pizza", "castle", "guitar", "sunflower"]`. No custom words are used.

## Requirements

### Functional Requirements

- **FR-001 — Player Name Trimming**: When the game starts, all participant names MUST be trimmed of leading and trailing whitespace.
- **FR-002 — Empty Name Rejection**: If any participant's name is empty or whitespace-only after trimming, the game start MUST be rejected with a clear error message.
- **FR-003 — Drawer Assignment**: When the game starts, the host MUST be assigned as the drawer for the first round.
- **FR-004 — Drawer Visual Identification**: The drawer MUST be visually identified on their screen (e.g., a "You are the drawer" label or badge).
- **FR-005 — Word Selection**: A secret word MUST be selected from the starter word list when the game starts. Selection MUST be deterministic — the same room code always produces the same word.
- **FR-006 — Word Visibility (Drawer)**: The selected word MUST be displayed to the drawer on the Game screen.
- **FR-007 — Word Hidden (Guessers)**: The selected word MUST NOT be visible to any non-drawer participant on their screen. The word must not be delivered to or displayed on any guesser's device.
- **FR-008 — Room Status Transition**: On successful game start, the room status MUST transition from "lobby" to "playing".
- **FR-009 — Word Source**: The word MUST be selected only from the starter word list. No external word sources or custom words are used.

### Key Entities

- **Room**: Holds participants, status (`"lobby"` → `"playing"`), and the active game state (drawer ID, secret word).
- **Participant**: A player in the room. May hold the `drawer` role during the playing phase.
- **Drawer**: The participant responsible for drawing in the current round. Always the host in Feature Group 2.
- **Secret Word**: The word the drawer must illustrate. Selected deterministically from the starter list. Visible only to the drawer.
- **Starter Word List**: The fixed set `["rocket", "pizza", "castle", "guitar", "sunflower"]` from which the secret word is drawn.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A host with 2+ players in the lobby can start the game and see the game screen with "You are the drawer" indicator and a secret word within 3 seconds of clicking "Start Game".
- **SC-002**: A guesser in the same game sees the game screen with no secret word visible. The word is absent from all visible UI elements.
- **SC-003**: Starting the same room twice (after restart) produces the same secret word. Room code is the sole input to word selection.
- **SC-004**: If any player has an empty/whitespace-only name, the game cannot start and the host sees a clear error message immediately.
- **SC-005**: In a 2-player game, the host is always the drawer and the other player is always the guesser. Role assignment is consistent.

## Assumptions

- **A-001 — Drawer is the Host**: The host is always the drawer for the first (and only) round. This matches the README's statement: "the host (or first player) becomes the clearly-identified drawer." No drawer rotation occurs.
- **A-002 — Single Round**: Only one round is played per game. The word is selected once at game start. No drawer rotation, no round cycling.
- **A-003 — Deterministic Word by Room Code**: The word is selected by applying a deterministic function to the room code (e.g., hash the code, take modulo word count). This ensures the same room always gets the same word while different rooms may get different words.
- **A-004 — Name Validation at Start**: Name trimming and empty-name rejection occur at game-start time, not at room-creation/join time. This is a second validation gate protecting against default names ("Player") or edge cases that slipped through.
- **A-005 — All Players Are Either Drawer or Guesser**: In a 2-player game, roles are `["drawer", "guesser"]`. The drawer role is assigned to the host. All non-drawer participants are guessers.

## Out of Scope

The following items are explicitly out of scope for this feature group:

- Multiple rounds or drawer rotation
- Custom or random word packs (only the 5 starter words)
- Timers, countdowns, or speed bonuses
- Spectator mode
- Drawing interaction or canvas implementation
- Guess submission or scoring
- Result screens or restart flow
- WebSockets or real-time push protocols
- Databases or persistent storage
- Authentication or user accounts
