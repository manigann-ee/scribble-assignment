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
