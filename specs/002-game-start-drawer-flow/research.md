# Research: Game Start & Drawer Flow

**Phase**: 0 — Outline & Research | **Date**: 2026-06-02

## Unknowns Resolved

No NEEDS CLARIFICATION markers were present in the spec. All technical decisions were derived directly from the plan and existing project architecture.

## Architecture Decisions

### Word Selection Algorithm

- **Decision**: Sum of character codes of room code, modulo word count
- **Rationale**: Simple, deterministic, no external dependencies. Room code is 4 uppercase alphanumeric chars (excluding I,O,0,1). Summing char codes gives a range of ~260–400, modulo 5 yields 0–4. Different rooms may collide (same sum → same word), which is acceptable for a 5-word list. The spec (AC-US2-02) only requires the same room code to always yield the same word.
- **Alternatives considered**: FNV-1a hash (over-engineered for 5 words), crypto.createHash (unnecessary dependency), random selection (non-deterministic, violates AC-US2-02).

### Per-Viewer Snapshot Filtering

- **Decision**: `toRoomSnapshot()` accepts `viewerParticipantId` and conditionally attaches `secretWord` to a new response wrapper type. The `RoomSnapshot` itself never contains `secretWord`.
- **Rationale**: FR-007 requires the word to not be delivered to guessers. A new `RoomSessionResponse` wrapper with optional `secretWord` field keeps the snapshot clean and makes the per-viewer contract explicit in the type system. The existing `toRoomSnapshot` already has a voided `viewerParticipantId` parameter — this decision activates it.
- **Alternatives considered**: Including `secretWord` in `RoomSnapshot` as `string | null` (would leak it to guessers on the type level, violating FR-007), separate endpoint for word delivery (unnecessary complexity).

### Name Validation Timing

- **Decision**: Name trimming and empty-name rejection occur at game-start time, not at room-creation/join time.
- **Rationale**: FR-001/FR-002 specify validation at game start. The FG1 flow already defaults empty names to "Player" on join. This provides a second validation gate. Players must have explicitly entered names by game time.
- **Alternatives considered**: Name required at join (would break FG1's "Player" default behavior), name editing in lobby (out of scope).

### Drawer Role Assignment

- **Decision**: Drawer is always the host (first participant). Set `room.drawerId = room.hostId` on game start.
- **Rationale**: FR-003, confirmed by A-001. Simple, deterministic, no election needed.
- **Alternatives considered**: Random drawer selection (spec says host is drawer), round-robin (only one round per game).

### Word Visibility Enforcement

- **Decision**: Backend enforces word visibility by checking `viewerParticipantId === room.drawerId` in `toRoomSnapshot()`. Frontend computes `isDrawer` from `participantId === room.drawerId` and conditionally renders the word.
- **Rationale**: Defense-in-depth — the backend never sends the word to guessers, so even if a guesser inspects network traffic or modifies frontend code, they cannot see the word.
- **Alternatives considered**: Frontend-only hiding (insecure — guesser could inspect JS or network), encrypting the word (over-engineered).

## Dependency Checks

| Dependency | Status | Notes |
|------------|--------|-------|
| Express 4.21 | Already present | No changes needed |
| React 18 + react-router-dom 6 | Already present | No changes needed |
| Vitest | Already present | Both frontend and backend configs exist |
| TypeScript 5.6 | Already present | Both tsconfigs |
| None needed | No new dependencies required | Per project constraints |
