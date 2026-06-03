import type { Guess } from "../services/api";
import { Card } from "./Card";

interface ResultHistoryProps {
  guesses: Guess[];
  participantId: string | null;
}

export function ResultHistory({ guesses, participantId }: ResultHistoryProps) {
  if (guesses.length === 0) {
    return (
      <Card title="Guess History">
        <div className="placeholder-block">
          <p>No guesses were submitted this round.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Guess History">
      <ul className="result-history">
        {guesses.map((guess, index) => {
          const isOwn = guess.participantId === participantId;
          return (
            <li
              key={`${guess.participantId}-${index}`}
              className={`result-history__entry ${guess.correct ? "result-history__entry--correct" : ""} ${isOwn ? "result-history__entry--own" : ""}`}
            >
              <div className="result-history__header">
                <span className="result-history__name">
                  {guess.displayName}
                  {isOwn ? " (you)" : ""}
                </span>
                <span className="result-history__indicator">
                  {guess.correct ? "Correct" : "Incorrect"}
                </span>
                <span className="result-history__score">
                  {guess.correct ? `+${guess.score}` : "0"}
                </span>
              </div>
              <div className="result-history__text">{guess.text}</div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
