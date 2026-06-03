import { useState } from "react";
import { useRoomStore, useRoomState } from "../state/roomStore";
import type { GuessResult } from "../services/api";

interface GuessInputProps {
  disabled?: boolean;
  onGuessResult?: (result: GuessResult) => void;
}

export function GuessInput({ disabled = false, onGuessResult }: GuessInputProps) {
  const [text, setText] = useState("");
  const store = useRoomStore();
  const { submitError } = useRoomState();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const result = await store.submitGuess(text);
    if (result) {
      setText("");
      onGuessResult?.(result);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {submitError ? (
        <div className="form__error">{submitError}</div>
      ) : null}
      <label className="form__field">
        <input
          className="form__input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type your guess here..."
          disabled={disabled}
          autoComplete="off"
        />
      </label>
      <div className="button-row button-row--compact">
        <button className="button button--primary" type="submit" disabled={disabled || !text.trim()}>
          Submit Guess
        </button>
      </div>
    </form>
  );
}
