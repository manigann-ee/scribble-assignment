import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "../components/Canvas";
import { Card } from "../components/Card";
import { GuessHistory } from "../components/GuessHistory";
import { GuessInput } from "../components/GuessInput";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useRoomStore, useRoomState } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const { room, participantId, isDrawer, secretWord } = useRoomState();
  const store = useRoomStore();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  if (!room) {
    return null;
  }

  const viewer = room.participants.find((participant) => participant.id === participantId) ?? null;

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">{isDrawer ? "Draw the Word!" : "Guess the Word!"}</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Scoreboard participants={room.participants} scores={room.scores} currentUserId={participantId} />
          <GuessHistory guesses={room.guesses} participantId={participantId} />
        </aside>

        <div className="game-page__main">
          <Card title={isDrawer ? "Draw the word" : "Canvas"}>
            <Canvas strokes={room.strokes} isDrawer={isDrawer} />
            {isDrawer && (
              <div className="button-row">
                <button className="button button--secondary" onClick={() => store.clearCanvas()}>
                  Clear Canvas
                </button>
              </div>
            )}
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Player Info">
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewer?.name ?? "Unknown player"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{isDrawer ? "Drawing" : "Guessing"}</dd>
              </div>
              {isDrawer && secretWord && (
                <div>
                  <dt>Your Word</dt>
                  <dd className="secret-word">{secretWord}</dd>
                </div>
              )}
            </dl>
            {isDrawer && (
              <div className="drawer-badge">You are the drawer</div>
            )}
          </Card>

          {!isDrawer && (
            <Card title="Your Guess">
              <GuessInput />
            </Card>
          )}
        </aside>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
