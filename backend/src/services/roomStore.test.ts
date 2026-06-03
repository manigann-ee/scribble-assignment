import { describe, expect, it } from "vitest";
import { createRoom, joinRoom, startGame, getRoom, transferHost } from "./roomStore.js";

describe("roomStore", () => {
  it("createRoom returns a room with a 4-character uppercase code", () => {
    const result = createRoom("Alice");

    expect(result.room.code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(result.room.participants).toHaveLength(1);
    expect(result.room.participants[0].name).toBe("Alice");
    expect(result.participantId).toBeDefined();
  });

  it("createRoom sets hostId equal to creator's participant ID", () => {
    const result = createRoom("Alice");

    expect(result.room.hostId).toBe(result.participantId);
  });

  it("createRoom assigns 'Player' when name is empty", () => {
    const result = createRoom("");

    expect(result.room.participants[0].name).toBe("Player");
  });

  it("createRoom assigns 'Player' when name is whitespace only", () => {
    const result = createRoom("   ");

    expect(result.room.participants[0].name).toBe("Player");
  });

  it("joinRoom returns null for an unknown room code", () => {
    const result = joinRoom("ZZZZ", "Bob");

    expect(result).toBeNull();
  });

  it("joinRoom allows duplicate display names", () => {
    const { room } = createRoom("Alice");
    const result = joinRoom(room.code, "Alice");

    expect(result).not.toBeNull();
    expect(result!.room.participants).toHaveLength(2);
    expect(result!.room.participants[0].name).toBe("Alice");
    expect(result!.room.participants[1].name).toBe("Alice");
  });

  it("startGame fails if requester is not host", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob");

    expect(() => startGame(room.code, joiner!.participantId)).toThrow(
      "Only the host can start the game"
    );
  });

  it("startGame fails if fewer than 2 participants", () => {
    const { room, participantId } = createRoom("Alice");

    expect(() => startGame(room.code, participantId)).toThrow(
      "At least 2 players are required to start"
    );
  });

  it("startGame succeeds when host is present with at least 2 participants", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");

    const result = startGame(room.code, participantId);

    expect(result).not.toBeNull();
    expect(result!.status).toBe("playing");
  });

  it("getRoom returns null for nonexistent code", () => {
    expect(getRoom("NOPE")).toBeNull();
  });

  it("Room A operations do not affect Room B (isolation)", () => {
    const roomA = createRoom("Alice");
    const roomB = createRoom("Bob");

    joinRoom(roomA.room.code, "Charlie");

    const snapA = getRoom(roomA.room.code);
    const snapB = getRoom(roomB.room.code);

    expect(snapA!.participants).toHaveLength(2);
    expect(snapB!.participants).toHaveLength(1);
    expect(snapA!.code).not.toBe(snapB!.code);
  });

  it("transferHost reassigns host to the earliest-joined remaining participant", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner1 = joinRoom(room.code, "Bob");
    const joiner2 = joinRoom(room.code, "Charlie");

    const refreshedRoom = getRoom(room.code)!;

    expect(refreshedRoom.hostId).toBe(participantId);

    const remaining = refreshedRoom.participants.filter(
      (p) => p.id !== refreshedRoom.hostId
    );
    remaining.sort(
      (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    );
    const expectedHost = remaining[0].id;

    transferHost(refreshedRoom);

    const updatedRoom = getRoom(room.code)!;
    expect(updatedRoom.hostId).toBe(expectedHost);
  });

  it("full flow: create room, join, fetch, start game", () => {
    const { room, participantId } = createRoom("Alice");
    expect(room.status).toBe("lobby");
    expect(room.hostId).toBe(participantId);

    const joiner = joinRoom(room.code, "Bob");
    expect(joiner!.room.participants).toHaveLength(2);

    const fetched = getRoom(room.code);
    expect(fetched!.participants).toHaveLength(2);

    const started = startGame(room.code, participantId);
    expect(started!.status).toBe("playing");
  });

  it("two independent rooms have correct participant lists", () => {
    const a = createRoom("Alice");
    const b = createRoom("Bob");

    joinRoom(a.room.code, "Charlie");
    joinRoom(b.room.code, "Diana");

    const snapA = getRoom(a.room.code);
    const snapB = getRoom(b.room.code);

    expect(snapA!.participants).toHaveLength(2);
    expect(snapB!.participants).toHaveLength(2);
    expect(snapA!.participants.every((p) => p.name !== "Diana")).toBe(true);
    expect(snapB!.participants.every((p) => p.name !== "Charlie")).toBe(true);
  });
});
