interface WordRevealProps {
  secretWord: string;
}

export function WordReveal({ secretWord }: WordRevealProps) {
  return (
    <div className="word-reveal">
      <span className="word-reveal__label">The word was</span>
      <strong className="word-reveal__word">{secretWord}</strong>
    </div>
  );
}
