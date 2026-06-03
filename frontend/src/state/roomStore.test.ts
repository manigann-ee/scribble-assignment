import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomStore } from "./roomStore";

describe("RoomStore polling", () => {
  let store: RoomStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new RoomStore();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("startPolling sets up interval", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    store.startPolling();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
  });

  it("stopPolling clears interval", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    store.startPolling();
    store.stopPolling();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("startPolling does not create duplicate intervals", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    store.startPolling();
    store.startPolling();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });
});

describe("RoomStore role detection", () => {
  let store: RoomStore;

  beforeEach(() => {
    store = new RoomStore();
  });

  it("isDrawer is true when participantId matches drawerId", () => {
    store.setRoomSession({
      participantId: "p1",
      room: {
        code: "ABCD",
        status: "playing",
        participants: [],
        hostId: "p1",
        drawerId: "p1",
        strokes: [],
        guesses: [],
        scores: {},
        availableWords: [],
        roles: ["drawer", "guesser"]
      },
      secretWord: "rocket"
    });

    const state = store.getSnapshot();
    expect(state.isDrawer).toBe(true);
    expect(state.secretWord).toBe("rocket");
  });

  it("isDrawer is false when participantId does not match drawerId", () => {
    store.setRoomSession({
      participantId: "p2",
      room: {
        code: "ABCD",
        status: "playing",
        participants: [],
        hostId: "p1",
        drawerId: "p1",
        strokes: [],
        guesses: [],
        scores: {},
        availableWords: [],
        roles: ["drawer", "guesser"]
      }
    });

    const state = store.getSnapshot();
    expect(state.isDrawer).toBe(false);
    expect(state.secretWord).toBeNull();
  });

  it("setRoomSnapshot computes isDrawer correctly", () => {
    store.setRoomSession({
      participantId: "p1",
      room: {
        code: "ABCD",
        status: "lobby",
        participants: [],
        hostId: "p1",
        drawerId: null,
        strokes: [],
        guesses: [],
        scores: {},
        availableWords: [],
        roles: ["drawer", "guesser"]
      }
    });

    store.setRoomSnapshot({
      code: "ABCD",
      status: "playing",
      participants: [],
      hostId: "p1",
      drawerId: "p1",
      strokes: [],
      guesses: [],
      scores: {},
      availableWords: [],
      roles: ["drawer", "guesser"]
    });

    const state = store.getSnapshot();
    expect(state.isDrawer).toBe(true);
  });
});

describe("RoomStore strokes, guesses, scores", () => {
  let store: RoomStore;

  beforeEach(() => {
    store = new RoomStore();
  });

  it("setRoomSession stores strokes from room snapshot", () => {
    store.setRoomSession({
      participantId: "p1",
      room: {
        code: "ABCD",
        status: "playing",
        participants: [],
        hostId: "p1",
        drawerId: "p1",
        strokes: [{ participantId: "p1", points: [{ x: 0.1, y: 0.2 }], color: "#000000", width: 3, timestamp: "2026-01-01T00:00:00.000Z" }],
        guesses: [],
        scores: {},
        availableWords: [],
        roles: ["drawer", "guesser"]
      }
    });

    const state = store.getSnapshot();
    expect(state.room!.strokes).toHaveLength(1);
    expect(state.room!.strokes[0].points[0].x).toBe(0.1);
  });

  it("setRoomSession stores guesses from room snapshot", () => {
    store.setRoomSession({
      participantId: "p2",
      room: {
        code: "ABCD",
        status: "playing",
        participants: [],
        hostId: "p1",
        drawerId: "p1",
        strokes: [],
        guesses: [{
          participantId: "p2",
          displayName: "Bob",
          text: "rocket",
          normalized: "rocket",
          correct: true,
          score: 100,
          timestamp: "2026-01-01T00:00:00.000Z"
        }],
        scores: { p2: 100 },
        availableWords: [],
        roles: ["drawer", "guesser"]
      }
    });

    const state = store.getSnapshot();
    expect(state.room!.guesses).toHaveLength(1);
    expect(state.room!.guesses[0].correct).toBe(true);
    expect(state.room!.scores).toEqual({ p2: 100 });
  });

  it("submitGuess with empty text sets submitError", async () => {
    vi.stubGlobal("fetch", vi.fn());
    store.setRoomSession({
      participantId: "p1",
      room: {
        code: "ABCD",
        status: "playing",
        participants: [],
        hostId: "p1",
        drawerId: "p2",
        strokes: [],
        guesses: [],
        scores: {},
        availableWords: [],
        roles: ["drawer", "guesser"]
      }
    });

    const result = await store.submitGuess("   ");

    expect(result).toBeNull();
    expect(store.getSnapshot().submitError).toBe("Guess cannot be empty");
  });

  it("submitGuess with long text sets submitError", async () => {
    vi.stubGlobal("fetch", vi.fn());
    store.setRoomSession({
      participantId: "p1",
      room: {
        code: "ABCD",
        status: "playing",
        participants: [],
        hostId: "p1",
        drawerId: "p2",
        strokes: [],
        guesses: [],
        scores: {},
        availableWords: [],
        roles: ["drawer", "guesser"]
      }
    });

    const result = await store.submitGuess("a".repeat(101));

    expect(result).toBeNull();
    expect(store.getSnapshot().submitError).toBe("Guess must be 100 characters or fewer");
  });

  it("clearCanvas sets strokes to empty array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ strokes: [] })
    }));

    store.setRoomSession({
      participantId: "p1",
      room: {
        code: "ABCD",
        status: "playing",
        participants: [],
        hostId: "p1",
        drawerId: "p1",
        strokes: [{ participantId: "p1", points: [{ x: 0.1, y: 0.2 }], color: "#000000", width: 3, timestamp: "2026-01-01T00:00:00.000Z" }],
        guesses: [],
        scores: {},
        availableWords: [],
        roles: ["drawer", "guesser"]
      }
    });

    await store.clearCanvas();

    expect(store.getSnapshot().room!.strokes).toEqual([]);
  });
});
