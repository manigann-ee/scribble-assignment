# Research: Room Setup & Lobby

**Phase**: 0 — Outline & Research | **Date**: 2026-06-02

## Unknowns Resolved

No NEEDS CLARIFICATION markers were present in the spec. All technical decisions were derived directly from the existing project architecture and requirements.

## Architecture Decisions

### Polling Interval

- **Decision**: 2000ms `setInterval`-based HTTP polling
- **Rationale**: The spec requires "approximately 2 seconds" (NFR-001 tolerates ±1s). 2000ms is the midpoint. `setInterval` is the simplest browser API for periodic fetching. No libraries needed.
- **Alternatives considered**: `setTimeout` with recursive scheduling (more precise but not needed here), `requestAnimationFrame` (for rendering sync, not applicable).

### Polling Error Strategy

- **Decision**: Log error, display in UI, continue polling on next interval
- **Rationale**: NFR-002 requires no crash/unrecoverable state on failure. Exponential backoff or circuit breakers add complexity not justified for a lab environment.
- **Alternatives considered**: Exponential backoff (over-engineered for ~2s polling), AbortController on unmount (good practice but handled by componentWillUnmount pattern).

### Host Assignment

- **Decision**: First participant (creator) is host. `hostId` set on room creation, never null.
- **Rationale**: Matches spec FR-002. Simple, unambiguous.
- **Alternatives considered**: Election protocol (unnecessary complexity), manual host designation (no UI for it).

### Host Transfer

- **Decision**: On poll, if host is no longer in participants list, reassign to earliest-joined remaining player.
- **Rationale**: FR-012 mandates transfer. Earliest-joined is deterministic and requires no additional state.
- **Alternatives considered**: Vote-based (over-engineered), alphabetical (arbitrary), random (non-deterministic).

### Room Code Validation

- **Decision**: Client-side trim + empty check before server call. Server-side trim + empty check as defense-in-depth.
- **Rationale**: FR-005/FR-006 require rejection before server request. Client-side gives instant feedback. Server-side guards against direct API callers.
- **Alternatives considered**: Server-only validation (slower UX), regex pattern enforcement (not needed — codes are server-generated, only joining needs validation).

### Player Name Default

- **Decision**: Trim player name. If empty/whitespace-only after trim, assign "Player" on the server.
- **Rationale**: FR-013. The starter already has a `displayName()` helper doing exactly this.
- **Alternatives considered**: Reject empty names (spec says default), force minimum length (not required).

## Dependency Checks

| Dependency | Status | Notes |
|------------|--------|-------|
| Express 4.21 | Already present | `cors`, `express`, `zod` in `package.json` |
| React 18 + react-router-dom 6 | Already present | In frontend `package.json` |
| Vitest | Already present | Both frontend and backend configs exist |
| TypeScript 5.6 | Already present | Both tsconfigs |
| None needed | No new dependencies required | Per project constraints |
