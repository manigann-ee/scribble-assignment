# Research: Round End & Restart

**Phase**: 0 — Outline & Research | **Date**: 2026-06-02

## Unknowns Resolved

No NEEDS CLARIFICATION markers were present in the Technical Context. All decisions derive from the existing project architecture (TypeScript, Express, React, in-memory storage, HTTP polling).

## Architecture Decisions

### Round End State Representation

- **Decision**: Add a `"reveal"` status to the `RoomStatus` union type. When a round ends (host manual or all correct), the room transitions from `"playing"` to `"reveal"`. Clients detect the status change via polling and navigate to the result screen.
- **Rationale**: A dedicated status is the simplest way to communicate the state change to all clients. Since all sync is polling-based, clients discover the new status on their next poll cycle. No push notifications needed.
- **Alternatives considered**: Separate boolean `isRoundOver` flag (redundant with status), timer-based auto-dismiss (out of scope — constitution forbids timers), separate endpoint for result data (unnecessary — snapshot already contains the data).

### Secret Word Visibility in Reveal

- **Decision**: The `secretWord` field in `RoomSnapshot` is populated for ALL viewers when `status === "reveal"`. During `"playing"`, it is only populated for the drawer (FG3 behavior).
- **Rationale**: The spec requires all players to see the word on the result screen. Reusing the existing `secretWord` field with a status-dependent visibility rule avoids adding a new field. The frontend checks `status === "reveal"` to decide whether to display the word.
- **Alternatives considered**: Separate `revealedWord` field (unnecessary duplication), word included only in a new result endpoint (more endpoints to poll).

### Restart Mechanism

- **Decision**: Restart is a `POST /rooms/:code/restart` endpoint that clears round-specific fields (`secretWord`, `strokes`, `guesses`, `scores`, `drawerId`), sets status back to `"lobby"`, and preserves `participants` and `hostId`. All clients detect `status === "lobby"` via polling and navigate to the lobby page.
- **Rationale**: Resetting existing room state is simpler than creating a new room. Players keep their connection to the same room code. No need to regenerate invite codes or re-join.
- **Alternatives considered**: Delete and recreate room (loses player connections, requires re-join), redirect to home page to create new room (worse UX, extra steps).

### Round End Triggers

- **Decision**: Two triggers: (1) host clicks "End Round" button — a new `POST /rooms/:code/end-round` endpoint, and (2) auto-detect when all guessers have submitted a correct guess — checked inside the existing guess submission logic.
- **Rationale**: The host-triggered end gives the host control over game pacing. The auto-end provides a natural completion when everyone has guessed correctly. Both converge to the same `status = "reveal"` transition.
- **Alternatives considered**: Only manual end (players could be stuck if no host action), only automatic end (no flexibility if host wants to cut the round short).

### Result Page Component Structure

- **Decision**: New `ResultPage` component at `frontend/src/pages/ResultPage.tsx` renders the reveal screen. It contains a `WordReveal` component (shows the secret word), the existing `Scoreboard` (updated to use real scores), and a new `ResultHistory` component (full guess history). The host sees a "Play Again" button; non-hosts see "Waiting for host...".
- **Rationale**: A dedicated page keeps the reveal logic separate from the game page and lobby. Reuses existing components where possible. The page is conditionally rendered based on room status.
- **Alternatives considered**: Show result as a modal/overlay on the game page (complex state management), redirect to lobby with result banner (confusing UX — lobby should be "waiting for game" not "showing results").

### Idempotent Restart Handling

- **Decision**: The restart endpoint checks `room.status !== "reveal"` and returns an error (or no-op) if the room is not in reveal state. This prevents multiple rapid clicks from causing duplicate processing.
- **Rationale**: Simplest guard against rapid clicks. The frontend also disables the button on click, but the backend guard is the authoritative protection.
- **Alternatives considered**: Debounce on frontend only (race conditions possible with polling), idempotency key (unnecessary complexity for a single-button action).

## Dependency Checks

| Dependency | Status | Notes |
|------------|--------|-------|
| Express 4.21 | Already present | No changes needed |
| React 18 + react-router-dom 6 | Already present | New route for /result |
| Vitest | Already present | Both frontend and backend configs |
| TypeScript 5.6 | Already present | Both tsconfigs |
| None needed | No new dependencies required | All canvas and list rendering uses built-in browser APIs |
