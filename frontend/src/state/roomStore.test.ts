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
      availableWords: [],
      roles: ["drawer", "guesser"]
    });

    const state = store.getSnapshot();
    expect(state.isDrawer).toBe(true);
  });
});
