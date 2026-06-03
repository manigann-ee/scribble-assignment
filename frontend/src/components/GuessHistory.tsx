import { Card } from "./Card";
import type { Guess } from "../services/api";

interface GuessHistoryProps {
  guesses: Guess[];
  participantId: string | null;
}

export function GuessHistory({ guesses, participantId }: GuessHistoryProps) {
  if (guesses.length === 0) {
    return (
      <Card title="Guesses">
        <div className="placeholder-block" style={{ backgroundColor: '#f9fafb' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            No guesses yet. Waiting for players to submit...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Guesses">
      <ul className="guess-history">
        {guesses.map((guess, index) => {
          const isOwn = guess.participantId === participantId;
          return (
            <li
              key={`${guess.participantId}-${index}`}
              className={`guess-entry ${guess.correct ? "guess-entry--correct" : ""} ${isOwn ? "guess-entry--own" : ""}`}
            >
              <div className="guess-entry__header">
                <span className="guess-entry__name">
                  {guess.displayName}
                  {isOwn ? " (you)" : ""}
                </span>
                <span className="guess-entry__score">
                  {guess.correct ? "+100" : "0"}
                </span>
              </div>
              <div className="guess-entry__text">{guess.text}</div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
