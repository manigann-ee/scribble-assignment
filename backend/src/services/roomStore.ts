import { randomUUID } from "node:crypto";
import type { Guess, GuessResult, Participant, Point, Room, RoomSessionResponse, RoomSnapshot, Stroke } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

const rooms = new Map<string, Room>();

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function displayName(name?: string) {
  const trimmed = name?.trim() ?? "";
  return trimmed || "Player";
}

function createParticipant(name?: string): Participant {
  return {
    id: randomUUID(),
    name: displayName(name),
    joinedAt: now()
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function createRoom(playerName?: string) {
  const participant = createParticipant(playerName);
  const room: Room = {
    code: generateUniqueCode(),
    status: "lobby",
    participants: [participant],
    hostId: participant.id,
    drawerId: null,
    secretWord: null,
    strokes: [],
    guesses: [],
    scores: {},
    createdAt: now(),
    updatedAt: now()
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName?: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  const participant = createParticipant(playerName);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code);
  return room ? cloneRoom(room) : null;
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function startGame(code: string, participantId: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  if (room.hostId !== participantId) {
    throw new Error("Only the host can start the game");
  }

  if (room.participants.length < 2) {
    throw new Error("At least 2 players are required to start");
  }

  for (const p of room.participants) {
    p.name = p.name.trim();
    if (!p.name) {
      throw new Error("All players must have a name");
    }
  }

  room.drawerId = room.hostId;
  const hash = room.code.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  room.secretWord = [...STARTER_WORDS][hash % STARTER_WORDS.length];
  room.strokes = [];
  room.guesses = [];
  room.scores = {};
  room.status = "playing";

  saveRoom(room);

  return getRoom(code);
}

export function addStroke(code: string, participantId: string, points: Point[], color: string, width: number) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  if (room.status !== "playing") {
    throw new Error("Round is not active");
  }

  if (room.drawerId !== participantId) {
    throw new Error("Only the drawer can add strokes");
  }

  const stroke: Stroke = {
    participantId,
    points,
    color,
    width,
    timestamp: now()
  };

  room.strokes.push(stroke);
  saveRoom(room);

  return getRoom(code)!.strokes;
}

export function clearCanvas(code: string, participantId: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  if (room.drawerId !== participantId) {
    throw new Error("Only the drawer can clear the canvas");
  }

  room.strokes = [];
  saveRoom(room);

  return room.strokes;
}

export function submitGuess(code: string, participantId: string, text: string): GuessResult | null {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  if (room.status !== "playing") {
    throw new Error("Round is over");
  }

  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Guess cannot be empty");
  }

  if (trimmed.length > 100) {
    throw new Error("Guess must be 100 characters or fewer");
  }

  const participant = room.participants.find((p) => p.id === participantId);
  const displayName = participant?.name ?? "Unknown";

  const normalized = trimmed.toLowerCase();
  const secretNormalized = room.secretWord?.toLowerCase() ?? "";
  const correct = normalized === secretNormalized;

  const alreadyCorrect = room.guesses.some(
    (g) => g.participantId === participantId && g.correct
  );

  let score = 0;
  if (correct && !alreadyCorrect) {
    score = 100;
  }

  if (correct && !alreadyCorrect) {
    room.scores[participantId] = (room.scores[participantId] ?? 0) + score;
  }

  const guess: Guess = {
    participantId,
    displayName,
    text,
    normalized,
    correct,
    score,
    timestamp: now()
  };

  room.guesses.push(guess);
  saveRoom(room);

  if (correct) {
    const guessers = room.participants.filter((p) => p.id !== room.drawerId);
    const allCorrect = guessers.every((g) =>
      room.guesses.some((gu) => gu.participantId === g.id && gu.correct)
    );
    if (allCorrect && guessers.length > 0) {
      room.status = "reveal";
      saveRoom(room);
    }
  }

  return { correct, score, guess };
}

export function endRound(code: string, participantId: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  if (room.hostId !== participantId) {
    throw new Error("Only the host can end the round");
  }

  if (room.status !== "playing") {
    throw new Error("Round is not currently active");
  }

  room.status = "reveal";
  saveRoom(room);

  return getRoom(code);
}

export function restartGame(code: string, participantId: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  if (room.hostId !== participantId) {
    throw new Error("Only the host can restart the game");
  }

  if (room.status === "lobby") {
    return getRoom(code); // idempotent: already in lobby
  }

  if (room.status !== "reveal") {
    throw new Error("Game can only be restarted from the result screen");
  }

  room.secretWord = null;
  room.strokes = [];
  room.guesses = [];
  room.scores = {};
  room.drawerId = null;
  room.status = "lobby";
  saveRoom(room);

  return getRoom(code);
}

export function transferHost(room: Room) {
  const remaining = room.participants.filter((p) => p.id !== room.hostId);

  if (remaining.length > 0) {
    remaining.sort(
      (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    );
    room.hostId = remaining[0].id;
  }

  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSessionResponse {
  const snapshot: RoomSnapshot = {
    code: room.code,
    status: room.status,
    participants: room.participants.map((participant) => ({ ...participant })),
    hostId: room.hostId,
    drawerId: room.drawerId,
    strokes: room.strokes.map((s) => ({ ...s, points: [...s.points] })),
    guesses: room.guesses.map((g) => ({ ...g })),
    scores: { ...room.scores },
    availableWords: listWords(),
    roles: [...STARTER_ROLES]
  };

  const response: RoomSessionResponse = {
    participantId: viewerParticipantId ?? "",
    room: snapshot
  };

  if (room.status === "reveal" && room.secretWord) {
    response.secretWord = room.secretWord;
  } else if (viewerParticipantId && room.status === "playing" && room.drawerId === viewerParticipantId && room.secretWord) {
    response.secretWord = room.secretWord;
  }

  return response;
}
