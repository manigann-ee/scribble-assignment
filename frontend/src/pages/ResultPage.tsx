import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { ResultHistory } from "../components/ResultHistory";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { WordReveal } from "../components/WordReveal";
import { useRoomStore, useRoomState } from "../state/roomStore";

export function ResultPage() {
  const navigate = useNavigate();
  const store = useRoomStore();
  const { room, participantId, isHost, isLoading, secretWord } = useRoomState();
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
      return;
    }

    store.startPolling();
    return () => {
      store.stopPolling();
    };
  }, [navigate, room, store]);

  useEffect(() => {
    if (room && room.status !== "reveal") {
      if (room.status === "lobby") {
        navigate("/lobby", { replace: true });
      } else if (room.status === "playing") {
        navigate("/game", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [navigate, room]);

  if (!room || room.status !== "reveal") {
    return null;
  }

  async function handleRestart() {
    if (restarting || isLoading) {
      return;
    }

    setRestarting(true);
    try {
      await store.restartGame();
    } catch {
      setRestarting(false);
    }
  }

  return (
    <section className="panel result-page">
      <div className="result-page__header">
        <div className="result-page__header-left">
          <span className="section-kicker">Round Complete</span>
          <h1 className="result-page__title">Results</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <WordReveal secretWord={secretWord ?? ""} />

      <div className="summary-grid">
        <Scoreboard participants={room.participants} scores={room.scores} currentUserId={participantId} />
        <ResultHistory guesses={room.guesses} participantId={participantId} />
      </div>

      <div className="button-row button-row--spread">
        {isHost ? (
          <button className="button button--primary result-page__restart-btn" disabled={restarting || isLoading} onClick={handleRestart}>
            {restarting || isLoading ? "Restarting..." : "Play Again"}
          </button>
        ) : (
          <p className="status-line" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>Waiting for host to restart...</p>
        )}
      </div>
    </section>
  );
}
