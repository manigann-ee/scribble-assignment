import { describe, expect, it } from "vitest";
import { addStroke, clearCanvas, createRoom, getRoom, joinRoom, saveRoom, startGame, submitGuess, toRoomSnapshot, transferHost } from "./roomStore.js";

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

  it("startGame trims all participant names before processing", () => {
    const { room, participantId } = createRoom("Alice  ");
    joinRoom(room.code, "  Bob  ");

    const result = startGame(room.code, participantId);

    expect(result).not.toBeNull();
    expect(result!.participants[0].name).toBe("Alice");
    expect(result!.participants[1].name).toBe("Bob");
  });

  it("startGame rejects if any trimmed name is empty", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");

    const beforeGame = getRoom(room.code)!;
    beforeGame.participants[1].name = "   ";
    saveRoom(beforeGame);

    expect(() => startGame(room.code, participantId)).toThrow(
      "All players must have a name"
    );
  });

  it("startGame sets drawerId equal to hostId", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");

    const result = startGame(room.code, participantId);

    expect(result).not.toBeNull();
    expect(result!.drawerId).toBe(participantId);
  });

  it("startGame selects word deterministically from starter list", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");

    const result = startGame(room.code, participantId);

    expect(result).not.toBeNull();

    const validWords = ["rocket", "pizza", "castle", "guitar", "sunflower"];
    expect(validWords).toContain(result!.secretWord);

    const sameRoom = startGame(room.code, participantId);
    expect(sameRoom!.secretWord).toBe(result!.secretWord);
  });

  it("same room code always yields the same word", () => {
    const a = createRoom("Alice");
    joinRoom(a.room.code, "Bob");
    const resultA = startGame(a.room.code, a.participantId);

    const b = createRoom("Charlie");
    joinRoom(b.room.code, "Diana");
    const resultB = startGame(b.room.code, b.participantId);

    const expectedWordA = getRoom(a.room.code)!.secretWord;
    const expectedWordB = getRoom(b.room.code)!.secretWord;

    expect(expectedWordA).toBe(resultA!.secretWord);
    expect(expectedWordB).toBe(resultB!.secretWord);
  });

  it("toRoomSnapshot includes secretWord when viewer is the drawer", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    const snapshot = toRoomSnapshot(getRoom(room.code)!, participantId);

    expect(snapshot.secretWord).toBeDefined();
    expect(typeof snapshot.secretWord).toBe("string");
  });

  it("toRoomSnapshot excludes secretWord when viewer is not the drawer", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    const snapshot = toRoomSnapshot(getRoom(room.code)!, joiner!.participantId);

    expect(snapshot.secretWord).toBeUndefined();
  });

  it("startGame initializes empty strokes, guesses, and scores", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");

    const result = startGame(room.code, participantId);

    expect(result!.strokes).toEqual([]);
    expect(result!.guesses).toEqual([]);
    expect(result!.scores).toEqual({});
  });

  it("toRoomSnapshot includes strokes, guesses, and scores", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    const snapshot = toRoomSnapshot(getRoom(room.code)!, participantId);

    expect(snapshot.room.strokes).toBeDefined();
    expect(snapshot.room.guesses).toBeDefined();
    expect(snapshot.room.scores).toBeDefined();
    expect(Array.isArray(snapshot.room.strokes)).toBe(true);
    expect(Array.isArray(snapshot.room.guesses)).toBe(true);
    expect(typeof snapshot.room.scores).toBe("object");
  });

  it("addStroke appends a stroke when drawer adds it", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    const points = [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }];
    const strokes = addStroke(room.code, participantId, points, "#000000", 3);

    expect(strokes).toHaveLength(1);
    expect(strokes![0].points).toEqual(points);
    expect(strokes![0].participantId).toBe(participantId);
  });

  it("addStroke rejects non-drawer participant", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    const points = [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }];
    expect(() => addStroke(room.code, joiner!.participantId, points, "#000000", 3)).toThrow(
      "Only the drawer can add strokes"
    );
  });

  it("addStroke returns null for nonexistent room", () => {
    const result = addStroke("NOPE", "p1", [{ x: 0.1, y: 0.2 }], "#000000", 3);
    expect(result).toBeNull();
  });

  it("clearCanvas empties all strokes", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    addStroke(room.code, participantId, [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }], "#000000", 3);
    addStroke(room.code, participantId, [{ x: 0.5, y: 0.6 }], "#000000", 3);

    const result = clearCanvas(room.code, participantId);

    expect(result).toEqual([]);

    const snapshot = toRoomSnapshot(getRoom(room.code)!, participantId);
    expect(snapshot.room.strokes).toEqual([]);
  });

  it("clearCanvas rejects non-drawer participant", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    expect(() => clearCanvas(room.code, joiner!.participantId)).toThrow(
      "Only the drawer can clear the canvas"
    );
  });

  it("clearCanvas returns null for nonexistent room", () => {
    expect(clearCanvas("NOPE", "p1")).toBeNull();
  });

  it("submitGuess rejects empty guess after trim", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    expect(() => submitGuess(room.code, participantId, "   ")).toThrow("Guess cannot be empty");
    expect(() => submitGuess(room.code, participantId, "")).toThrow("Guess cannot be empty");
  });

  it("submitGuess rejects guess exceeding 100 characters", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    const longGuess = "a".repeat(101);
    expect(() => submitGuess(room.code, participantId, longGuess)).toThrow(
      "Guess must be 100 characters or fewer"
    );
  });

  it("submitGuess matches exact guess case-insensitively after trim", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    const secretWord = getRoom(room.code)!.secretWord!;

    const result1 = submitGuess(room.code, joiner!.participantId, `  ${secretWord.toUpperCase()}  `);
    expect(result1!.correct).toBe(true);
    expect(result1!.score).toBe(100);

    const result2 = submitGuess(room.code, joiner!.participantId, secretWord.toLowerCase());
    expect(result2!.correct).toBe(true);
    expect(result2!.score).toBe(0);
  });

  it("submitGuess records incorrect guess with 0 score", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    const result = submitGuess(room.code, joiner!.participantId, "wronganswer");

    expect(result!.correct).toBe(false);
    expect(result!.score).toBe(0);
  });

  it("submitGuess returns null for nonexistent room", () => {
    const result = submitGuess("NOPE", "p1", "test");
    expect(result).toBeNull();
  });

  it("submitGuess rejects guess when round is not active", () => {
    const { room } = createRoom("Alice");

    expect(() => submitGuess(room.code, "p1", "test")).toThrow("Round is over");
  });

  it("submitGuess records guess in shared history", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    submitGuess(room.code, joiner!.participantId, "pizza");

    const snapshot = toRoomSnapshot(getRoom(room.code)!, joiner!.participantId);
    expect(snapshot.room.guesses).toHaveLength(1);
    expect(snapshot.room.guesses[0].text).toBe("pizza");
    expect(snapshot.room.guesses[0].participantId).toBe(joiner!.participantId);
  });

  it("submitGuess awards 100 to multiple correct guessers independently", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner1 = joinRoom(room.code, "Bob")!;
    const joiner2 = joinRoom(room.code, "Charlie")!;
    startGame(room.code, participantId);

    const secretWord = getRoom(room.code)!.secretWord!;

    const r1 = submitGuess(room.code, joiner1.participantId, secretWord);
    expect(r1!.correct).toBe(true);
    expect(r1!.score).toBe(100);

    const r2 = submitGuess(room.code, joiner2.participantId, secretWord);
    expect(r2!.correct).toBe(true);
    expect(r2!.score).toBe(100);
  });

  it("submitGuess duplicate correct guess by same player awards 0", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!;
    startGame(room.code, participantId);

    const secretWord = getRoom(room.code)!.secretWord!;

    const first = submitGuess(room.code, joiner.participantId, secretWord);
    expect(first!.score).toBe(100);

    const second = submitGuess(room.code, joiner.participantId, secretWord);
    expect(second!.correct).toBe(true);
    expect(second!.score).toBe(0);
  });

  it("submitGuess scores appear in room.scores", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!;
    startGame(room.code, participantId);

    const secretWord = getRoom(room.code)!.secretWord!;

    submitGuess(room.code, joiner.participantId, secretWord);

    const snapshot = toRoomSnapshot(getRoom(room.code)!, participantId);
    expect(snapshot.room.scores[joiner.participantId]).toBe(100);
  });

  it("submitGuess guess history is ordered chronologically", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!;
    startGame(room.code, participantId);

    submitGuess(room.code, joiner.participantId, "wrong1");
    submitGuess(room.code, joiner.participantId, "wrong2");
    submitGuess(room.code, joiner.participantId, "wrong3");

    const snapshot = toRoomSnapshot(getRoom(room.code)!, participantId);
    expect(snapshot.room.guesses).toHaveLength(3);
    expect(snapshot.room.guesses[0].text).toBe("wrong1");
    expect(snapshot.room.guesses[1].text).toBe("wrong2");
    expect(snapshot.room.guesses[2].text).toBe("wrong3");
  });

  it("partial match is not considered correct", () => {
    const { room, participantId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!;
    startGame(room.code, participantId);

    const result = submitGuess(room.code, joiner.participantId, "my rocket ship");
    expect(result!.correct).toBe(false);
    expect(result!.score).toBe(0);
  });

  it("drawer can also submit a guess", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, participantId);

    const secretWord = getRoom(room.code)!.secretWord!;
    const result = submitGuess(room.code, participantId, secretWord);

    expect(result!.correct).toBe(true);
    expect(result!.score).toBe(100);
  });

  it("addStroke rejects when round is not active", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");

    expect(() =>
      addStroke(room.code, participantId, [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }], "#000000", 3)
    ).toThrow("Round is not active");
  });
});
