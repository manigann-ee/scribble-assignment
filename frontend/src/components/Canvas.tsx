import { useEffect, useRef, type PointerEvent } from "react";
import { useRoomStore, useRoomState } from "../state/roomStore";
import type { Point, Stroke } from "../services/api";

interface CanvasProps {
  strokes: Stroke[];
  isDrawer: boolean;
  width?: number;
  height?: number;
}

function renderStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const first = stroke.points[0];
    ctx.moveTo(first.x * ctx.canvas.width, first.y * ctx.canvas.height);

    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      ctx.lineTo(p.x * ctx.canvas.width, p.y * ctx.canvas.height);
    }

    ctx.stroke();
  }
}

export function Canvas({ strokes, isDrawer, width = 800, height = 500 }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const store = useRoomStore();
  const { room } = useRoomState();

  // Render committed strokes on each poll update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderStrokes(ctx, strokes);
  }, [strokes]);

  function normalizePoint(clientX: number, clientY: number): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer) return;

    event.preventDefault();
    canvasRef.current?.setPointerCapture(event.pointerId);

    isDrawing.current = true;
    const point = normalizePoint(event.clientX, event.clientY);
    currentPoints.current = [point];
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !isDrawer) return;

    event.preventDefault();

    const point = normalizePoint(event.clientX, event.clientY);
    currentPoints.current.push(point);

    // Render current stroke in-progress locally
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Redraw all committed strokes first
    renderStrokes(ctx, strokes);
    if (!room) return;

    // Then draw in-progress stroke
    if (currentPoints.current.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const first = currentPoints.current[0];
      ctx.moveTo(first.x * canvas.width, first.y * canvas.height);

      for (let i = 1; i < currentPoints.current.length; i++) {
        const p = currentPoints.current[i];
        ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
      }

      ctx.stroke();
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !isDrawer) return;

    event.preventDefault();
    isDrawing.current = false;

    canvasRef.current?.releasePointerCapture(event.pointerId);

    if (currentPoints.current.length >= 2) {
      store.addStroke([...currentPoints.current]);
    }

    currentPoints.current = [];
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`canvas ${isDrawer ? "canvas--interactive" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
