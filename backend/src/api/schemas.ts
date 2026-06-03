import { z } from "zod";

export const createRoomSchema = z.object({
  playerName: z.string().trim().optional()
});

export const joinRoomSchema = z.object({
  playerName: z.string().trim().optional()
});

export const startGameSchema = z.object({
  participantId: z.string()
});

export const roomCodeParamsSchema = z.object({
  code: z.string()
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().optional()
});

export const strokePointsSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1)
});

export const strokeSchema = z.object({
  participantId: z.string(),
  points: z.array(strokePointsSchema).min(2, "Stroke must contain at least 2 points"),
  color: z.string().optional().default("#000000"),
  width: z.number().optional().default(3)
});

export const clearCanvasSchema = z.object({
  participantId: z.string()
});

export const guessSubmissionSchema = z.object({
  participantId: z.string(),
  text: z.string()
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
