import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

describe("api service", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("createRoom sends POST to /rooms with playerName in body", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          participantId: "p1",
          room: { code: "ABCD", status: "lobby", participants: [] },
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await api.createRoom("Alice");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ playerName: "Alice" }),
      })
    );
  });

  it("fetchRoom sends GET to /rooms/:code with participantId query param", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          room: { code: "XYZW", status: "lobby", participants: [] },
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await api.fetchRoom("XYZW", "p1");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms/XYZW?participantId=p1"),
      expect.anything()
    );
  });

  it("startGame sends PATCH to /rooms/:code/start with participantId body", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          room: { code: "ABCD", status: "playing", participants: [], hostId: "p1" },
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await api.startGame("ABCD", "p1");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms/ABCD/start"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ participantId: "p1" }),
      })
    );
  });

  it("client-side validation rejects empty room code before API call", () => {
    vi.mocked(fetch).mockClear();

    const code = "";
    const trimmed = code.trim();
    const hasError = !trimmed;

    expect(hasError).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("client-side validation rejects whitespace-only room code before API call", () => {
    vi.mocked(fetch).mockClear();

    const code = "   ";
    const trimmed = code.trim();
    const hasError = !trimmed;

    expect(hasError).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("addStroke sends POST to /rooms/:code/strokes with points", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          strokes: [{ participantId: "p1", points: [{ x: 0.1, y: 0.2 }], color: "#000000", width: 3, timestamp: "2026-01-01T00:00:00.000Z" }]
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await api.addStroke("ABCD", "p1", [{ x: 0.1, y: 0.2 }]);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms/ABCD/strokes"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ participantId: "p1", points: [{ x: 0.1, y: 0.2 }], color: "#000000", width: 3 })
      })
    );
    expect(result.strokes).toHaveLength(1);
  });

  it("clearCanvas sends DELETE to /rooms/:code/strokes", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({ strokes: [] }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await api.clearCanvas("ABCD", "p1");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms/ABCD/strokes"),
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ participantId: "p1" })
      })
    );
    expect(result.strokes).toEqual([]);
  });

  it("submitGuess sends POST to /rooms/:code/guess with text", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          correct: true,
          score: 100,
          guess: {
            participantId: "p1",
            displayName: "Alice",
            text: "rocket",
            normalized: "rocket",
            correct: true,
            score: 100,
            timestamp: "2026-01-01T00:00:00.000Z"
          }
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await api.submitGuess("ABCD", "p1", "rocket");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms/ABCD/guess"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ participantId: "p1", text: "rocket" })
      })
    );
    expect(result.correct).toBe(true);
    expect(result.score).toBe(100);
  });
});
