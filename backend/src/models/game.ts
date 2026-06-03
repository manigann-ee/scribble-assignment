export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "playing";

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

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  hostId: string;
  drawerId: string | null;
  secretWord: string | null;
  strokes: Stroke[];
  guesses: Guess[];
  scores: Scores;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
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
