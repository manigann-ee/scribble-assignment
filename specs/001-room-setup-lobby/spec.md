# Feature Specification: Room Setup & Lobby

**Feature Branch**: `001-room-setup-lobby`

**Created**: 2026-06-02

**Status**: Draft

**Input**: Feature Group 1: Room Setup & Lobby — Room creation, joining, host tracking, polling, and start-game preconditions.

## User Scenarios & Testing

### User Story 1 — Player Creates a Room (Priority: P1)

A player wants to host a drawing game. They provide a name, create a room, and are automatically designated as the host. They land in the lobby where the room code is displayed for sharing.

**Why this priority**: Room creation is the entry point for the entire game flow. Without it, no game can start.

**Independent Test**: A single player can open the app, enter a name, click "Create Room," and see a lobby with their name listed and a unique room code displayed.

**Acceptance Scenarios**:

1. **AC-US1-01**: **Given** the player is on the Create Room screen, **When** they enter a valid name and submit, **Then** a new room is created, the player is marked as host, and they are redirected to the Lobby screen showing the room code.
2. **AC-US1-02**: **Given** the player creates a room without entering a name, **When** they submit, **Then** a default name ("Player") is assigned and the room is created successfully.
3. **AC-US1-03**: **Given** two players create rooms simultaneously from different browsers, **When** both submissions are processed, **Then** each receives a different, non-conflicting room code.

---

### User Story 2 — Player Joins a Room (Priority: P1)

A player wants to join a friend's game. They enter the room code and their name, and join the lobby along with other waiting players.

**Why this priority**: Joining is the second core user flow and must work reliably for multiplayer to function.

**Independent Test**: A second player can open the app, enter a valid room code and name, submit, and land in the lobby showing the existing participant list.

**Acceptance Scenarios**:

1. **AC-US2-01**: **Given** a room exists with code "ABCD", **When** a player submits the code "ABCD" with a valid name, **Then** they join the room and see the lobby with all participants listed.
2. **AC-US2-02**: **Given** a room exists, **When** a player joins without entering a name, **Then** a default name ("Player") is assigned and they join successfully.
3. **AC-US2-03**: **Given** a room exists with player "Alice", **When** another player named "Alice" attempts to join, **Then** they are allowed to join (names are not required to be unique).
4. **AC-US2-04**: **Given** a room exists, **When** a player submits a blank or whitespace-only room code, **Then** they receive a clear error message and are not redirected.
5. **AC-US2-05**: **Given** a room exists, **When** a player submits a room code containing only whitespace characters, **Then** they receive a clear error message and are not redirected.
6. **AC-US2-06**: **Given** no room exists with code "ZZZZ", **When** a player submits "ZZZZ", **Then** they receive a clear "Room not found" error message and remain on the Join screen.

---

### User Story 3 — Lobby Polling Keeps Participants Synced (Priority: P1)

Players in the lobby see an up-to-date participant list without manually refreshing. The lobby automatically polls the server so new joiners appear and the host can start when ready.

**Why this priority**: Without automatic syncing, players cannot see when others join or when the game starts. Manual refresh is not acceptable for the target experience.

**Independent Test**: Two browser tabs join the same room. When a third player joins in a separate tab, the first two tabs show the updated participant list within approximately 2 seconds without manual refresh.

**Acceptance Scenarios**:

1. **AC-US3-01**: **Given** a player is in the lobby, **When** another player joins the same room, **Then** the first player's participant list updates automatically within approximately 2 seconds.
2. **AC-US3-02**: **Given** a player is in the lobby, **When** they have no internet connectivity, **Then** they see a polling error message (without crashing) and the lobby continues to retry.

---

### User Story 4 — Host Starts the Game (Priority: P1)

Only the room host can start the game, and only when at least 2 players are in the lobby. Other players see the start option disabled or hidden.

**Why this priority**: Host-only control prevents any player from starting the game prematurely. The 2-player minimum ensures the game is playable.

**Independent Test**: In a room with the host and one other player, the host sees an enabled "Start Game" button. The non-host player does not see an enabled start option. With only the host present, the start button is disabled for all.

**Acceptance Scenarios**:

1. **AC-US4-01**: **Given** the host is in the lobby with at least 1 other participant, **When** the host clicks "Start Game", **Then** the game starts and all players are redirected to the Game screen.
2. **AC-US4-02**: **Given** the host is alone in the lobby (only 1 player), **When** they view the lobby, **Then** the "Start Game" button is disabled or not visible.
3. **AC-US4-03**: **Given** a non-host player is in the lobby with 2 or more total players, **When** they view the lobby, **Then** the "Start Game" button is disabled or not visible for them.
4. **AC-US4-04**: **Given** a room has 2 or more players but the host has disconnected, **When** the remaining players are in the lobby, **Then** host status transfers to the next earliest-joined player.

---

### Edge Cases

- **EC-01 — Empty room code**: If a player submits an empty string as the room code on the Join screen, they receive a clear error message ("Room code is required") and are not redirected. No request is sent to the server.
- **EC-02 — Whitespace room code**: If a player submits a code consisting only of whitespace characters ("   "), it is treated as empty — trimmed client-side to an empty string, validated, and rejected with the same error as EC-01.
- **EC-03 — Nonexistent room code**: If a player submits a well-formed code (e.g., "ZZZZ") for a room that does not exist, the server returns a "Room not found" error and the player stays on the Join screen with a clear message.
- **EC-04 — Duplicate player names**: If two or more players join with the same name (e.g., "Alice"), both are allowed. Each participant is identified by a unique internal ID, and the display name is not required to be unique. The UI shows duplicate names as-is.
- **EC-05 — Simultaneous room creation**: If two players create rooms at nearly the same instant, the server's code generation ensures each receives a unique 4-character code. In the event of a collision (negligible probability), the server retries with a new code automatically. No duplicate codes are issued.
- **EC-06 — Host disconnect**: If the host leaves the room or disconnects, host privileges transfer to the player who joined earliest among the remaining participants. If all players leave, the room remains in memory but is effectively orphaned (no automated cleanup in this feature group).

## Requirements

### Functional Requirements

- **FR-001 — Room Creation**: The system MUST allow a player to create a new room by providing a player name and receive a unique 4-character room code.
- **FR-002 — Host Assignment**: The system MUST designate the creator of a room as the host. The host identity MUST be persisted and retrievable via the room snapshot.
- **FR-003 — Join by Code**: The system MUST allow a player to join an existing room by providing a room code and a player name.
- **FR-004 — Room Code Format**: All room codes MUST consist of 4 uppercase alphanumeric characters, excluding ambiguous characters (I, O, 0, 1). Codes MUST be unique across all active rooms.
- **FR-005 — Empty Code Rejection**: The system MUST reject a join attempt with an empty room code before sending a server request. The player MUST see a clear "Room code is required" message.
- **FR-006 — Whitespace Code Handling**: The system MUST trim whitespace from room code input. If the result is empty, it MUST be rejected as an empty code.
- **FR-007 — Nonexistent Code Handling**: The system MUST return a "Room not found" error when a join attempt uses a code that does not match any active room.
- **FR-008 — Room Isolation**: Players in one room MUST NOT see data from any other room. Room snapshots MUST only contain participants and state for that specific room.
- **FR-009 — Lobby Polling**: The lobby MUST automatically poll the server for room state updates at approximately 2-second intervals while the player is on the Lobby screen.
- **FR-010 — Host-Only Start Game**: Only the room host MUST be able to initiate game start. Non-host players MUST see the start option disabled or hidden.
- **FR-011 — Minimum Players to Start**: The "Start Game" action MUST only be available when at least 2 players (host + at least 1 other) are present in the room.
- **FR-012 — Host Transfer on Disconnect**: If the host leaves the room, host status MUST transfer to the remaining participant who joined earliest. If the host is the last player, no transfer occurs.
- **FR-013 — Player Name Default**: If a player submits a room creation or join request without a player name (empty or whitespace-only after trim), the system MUST assign the default name "Player".
- **FR-014 — Player Name Display**: Duplicate player names MUST be allowed. Each participant is disambiguated by a unique internal identifier, not by display name uniqueness.

### Non-Functional Requirements

- **NFR-001 — Polling Cadence**: Lobby polling MUST occur at approximately 2-second intervals, with acceptable variance of ±1 second (1–3 second range).
- **NFR-002 — Polling Reliability**: If a poll request fails (network error, server unavailable), the client MUST retry on the next scheduled interval without crashing or entering an unrecoverable error state.
- **NFR-003 — Error Message Clarity**: All user-facing error messages MUST be phrased in plain language understandable to a non-technical user (e.g., "Room not found — check the code and try again" rather than "404: Not Found").
- **NFR-004 — No Authentication**: The system MUST NOT require login, session, or any form of authentication for room creation or joining.
- **NFR-005 — No Real-Time Protocol**: The system MUST use HTTP request-response for all communication. WebSockets, SSE, or other real-time push protocols MUST NOT be used.

### Key Entities

- **Player**: A person participating in the game. Identified by a unique internal ID (UUID) and a display name. A player may be the host of a room.
- **Room**: A virtual space identified by a unique 4-character code. Contains a list of participants, a host designation, a status (lobby), and timestamps. Exists only in memory while the server runs.
- **Room Code**: A 4-character uppercase alphanumeric string used as the primary key for joining a room. Excludes ambiguous characters (I, O, 0, 1).
- **Host**: The player who created the room. Has exclusive permission to start the game. Host status is transferable on disconnect.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Two players can each open the app, create and join the same room, and see each other in the lobby participant list within 3 seconds of the join action.
- **SC-002**: A player who enters an empty, whitespace-only, or nonexistent room code sees a clear error message within 2 seconds of submission and remains on the Join screen.
- **SC-003**: In a room with the host and 2+ total players, only the host sees an enabled "Start Game" option. Non-host players see it disabled or absent.
- **SC-004**: The host cannot start the game when only 1 player is in the room. The start option is disabled until at least a second player joins.
- **SC-005**: When a new player joins a room, all existing lobby participants see the updated list within approximately 3 seconds without manual refresh.
- **SC-006**: Three separate rooms can be created and joined simultaneously with no cross-room data leakage — each room's participant list only shows its own members.

## Assumptions

- **A-001 — Host Transfer on Disconnect**: If the host disconnects (leaves the room), host status transfers to the remaining participant who joined earliest. This is a reasonable default that prevents game deadlock.
- **A-002 — Single-Tab Play**: Each player uses a single browser tab. The system does not need to handle a single player joining the same room from multiple tabs.
- **A-003 — Two-Player Minimum**: The minimum viable game requires at least 2 players (one drawer, one guesser). The start game action is locked until this threshold is met.
- **A-004 — Manual Room Cleanup**: Rooms are not automatically cleaned up or garbage-collected. Abandoned rooms remain in server memory until the server restarts. This is acceptable for a lab environment but would need addressing in production.
- **A-005 — Player Names Not Unique**: Duplicate player names are permitted. This avoids complexity of name-uniqueness enforcement and matches the starter's behavior where participants are disambiguated by internal ID.
- **A-006 — Out-of-Scope Items**: WebSockets, databases, authentication, deployment, additional libraries, multiple rounds, timers, spectator mode, moderation, and room passwords remain excluded as defined in the project constitution.

## Out of Scope

The following items are explicitly out of scope for this feature group and must not be implemented:

- WebSockets or real-time push protocols (polling only)
- Databases or persistent storage (in-memory only)
- Authentication, sessions, JWT, or user accounts
- Deployment, CI/CD, or containerization
- New state-management or routing libraries beyond what the starter ships
- Multiple rounds, drawer rotation, timers, or countdowns
- Custom or random word packs
- Spectator mode
- Moderation features (kick, mute)
- Room passwords or invite links
- Rewriting the starter from scratch
- Unjustified top-level dependencies
- Unrelated refactors
