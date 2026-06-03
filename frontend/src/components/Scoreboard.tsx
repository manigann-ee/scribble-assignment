import { Card } from "./Card";
import type { Participant, Scores } from "../services/api";

interface ScoreboardProps {
  participants: Participant[];
  scores: Scores;
  currentUserId: string | null;
}

export function Scoreboard({ participants, scores, currentUserId }: ScoreboardProps) {
  return (
    <Card title="Scoreboard">
      <ul className="scoreboard">
        {participants.map((participant) => {
          const score = scores[participant.id] ?? 0;
          const isCurrentUser = participant.id === currentUserId;
          return (
            <li
              key={participant.id}
              className={`scoreboard__entry ${isCurrentUser ? "scoreboard__entry--me" : ""}`}
            >
              <span className="scoreboard__name">
                {participant.name}
                {isCurrentUser ? " (you)" : ""}
              </span>
              <strong className="scoreboard__score">{score}</strong>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
