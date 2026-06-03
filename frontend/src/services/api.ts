export type ParticipantRole = "drawer" | "guesser";

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  participantId: string;
  points: Point[];
  color: string;
  width: number;
  timestamp: string;
}

export interface Guess {
  participantId: string;
  displayName: string;
  text: string;
  normalized: string;
  correct: boolean;
  score: number;
  timestamp: string;
}

export type Scores = Record<string, number>;

export interface RoomSnapshot {
  code: string;
  status: "lobby" | "playing";
  participants: Participant[];
  hostId: string;
  drawerId: string | null;
  strokes: Stroke[];
  guesses: Guess[];
  scores: Scores;
  availableWords: string[];
  roles: ParticipantRole[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
  secretWord?: string;
}

export interface GuessResult {
  correct: boolean;
  score: number;
  guess: Guess;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ message: "Request failed" }))) as {
      message?: string;
    };

    throw new Error(errorBody.message ?? "Request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  createRoom(playerName: string) {
    return request<RoomSessionResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  joinRoom(code: string, playerName: string) {
    return request<RoomSessionResponse>(`/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  fetchRoom(code: string, participantId?: string) {
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";
    return request<RoomSessionResponse>(`/rooms/${encodeURIComponent(code)}${query}`);
  },
  startGame(code: string, participantId: string) {
    return request<RoomSessionResponse>(`/rooms/${encodeURIComponent(code)}/start`, {
      method: "PATCH",
      body: JSON.stringify({ participantId })
    });
  },
  addStroke(code: string, participantId: string, points: Point[], color = "#000000", width = 3) {
    return request<{ strokes: Stroke[] }>(`/rooms/${encodeURIComponent(code)}/strokes`, {
      method: "POST",
      body: JSON.stringify({ participantId, points, color, width })
    });
  },
  clearCanvas(code: string, participantId: string) {
    return request<{ strokes: Stroke[] }>(`/rooms/${encodeURIComponent(code)}/strokes`, {
      method: "DELETE",
      body: JSON.stringify({ participantId })
    });
  },
  submitGuess(code: string, participantId: string, text: string) {
    return request<GuessResult>(`/rooms/${encodeURIComponent(code)}/guess`, {
      method: "POST",
      body: JSON.stringify({ participantId, text })
    });
  }
};
