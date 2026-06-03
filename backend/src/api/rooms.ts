import { Router } from "express";
import {
  clearCanvasSchema,
  createRoomSchema,
  guessSubmissionSchema,
  HttpError,
  joinRoomSchema,
  roomCodeParamsSchema,
  roomViewerQuerySchema,
  startGameSchema,
  strokeSchema
} from "./schemas.js";
import { addStroke, clearCanvas, createRoom, getRoom, joinRoom, startGame, submitGuess, toRoomSnapshot } from "../services/roomStore.js";

export function createRoomsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const { playerName } = createRoomSchema.parse(request.body);
      const result = createRoom(playerName);

      response.status(201).json(toRoomSnapshot(result.room, result.participantId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/join", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { playerName } = joinRoomSchema.parse(request.body);
      const result = joinRoom(code.toUpperCase(), playerName);

      if (!result) {
        throw new HttpError(404, "Unable to join room");
      }

      response.json(toRoomSnapshot(result.room, result.participantId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:code/start", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = startGameSchema.parse(request.body);
      const room = startGame(code.toUpperCase(), participantId);

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      response.json(toRoomSnapshot(room, participantId));
    } catch (error) {
      if (error instanceof Error && error.message === "Only the host can start the game") {
        next(new HttpError(403, error.message));
      } else if (error instanceof Error && (error.message === "At least 2 players are required to start" || error.message === "All players must have a name")) {
        next(new HttpError(400, error.message));
      } else {
        next(error);
      }
    }
  });

  router.get("/:code", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = roomViewerQuerySchema.parse(request.query);
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Unable to load room");
      }

      response.json(toRoomSnapshot(room, participantId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/strokes", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, points, color, width } = strokeSchema.parse(request.body);
      const strokes = addStroke(code.toUpperCase(), participantId, points, color, width);

      if (!strokes) {
        throw new HttpError(404, "Room not found");
      }

      response.status(201).json({ strokes });
    } catch (error) {
      if (error instanceof Error && error.message === "Only the drawer can add strokes") {
        next(new HttpError(403, error.message));
      } else if (error instanceof Error && error.message === "Round is not active") {
        next(new HttpError(400, error.message));
      } else {
        next(error);
      }
    }
  });

  router.delete("/:code/strokes", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = clearCanvasSchema.parse(request.body);
      const strokes = clearCanvas(code.toUpperCase(), participantId);

      if (!strokes) {
        throw new HttpError(404, "Room not found");
      }

      response.json({ strokes });
    } catch (error) {
      if (error instanceof Error && error.message === "Only the drawer can clear the canvas") {
        next(new HttpError(403, error.message));
      } else {
        next(error);
      }
    }
  });

  router.post("/:code/guess", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, text } = guessSubmissionSchema.parse(request.body);
      const result = submitGuess(code.toUpperCase(), participantId, text);

      if (!result) {
        throw new HttpError(404, "Room not found");
      }

      response.json({ correct: result.correct, score: result.score, guess: result.guess });
    } catch (error) {
      if (error instanceof Error && error.message === "Round is over") {
        next(new HttpError(400, error.message));
      } else if (error instanceof Error && (error.message === "Guess cannot be empty" || error.message === "Guess must be 100 characters or fewer")) {
        next(new HttpError(400, error.message));
      } else {
        next(error);
      }
    }
  });

  return router;
}
