import { roundTime } from "./time";
import { tokenize } from "./tokenize";
import type { Token } from "./types";

export interface TokenEdit {
  /** The tokens after the edit; the same array when the text did not change. */
  tokens: Token[];
  /** How many words the edit added. Replacing one token can only add words. */
  shift: number;
}

/** Exactly one trailing space when the word was followed by one. */
function spaced(text: string, trailing: boolean): string {
  return `${text.trim()}${trailing ? " " : ""}`;
}

/**
 * Replaces one token's text with what the user typed, re-splitting it into the
 * words DMLL times.
 *
 * A token keeps the space that follows it, and the last token of a line keeps
 * none, so the tokens still join back to the line. A word that turns into
 * several words splits its own start–end span in proportion to their length:
 * no timing is invented, and an untimed word stays untimed.
 */
export function setTokenText(tokens: Token[], index: number, text: string): TokenEdit {
  const token = tokens[index];
  if (!token) return { tokens, shift: 0 };

  const words = tokenize(text);
  if (words.length === 0) return { tokens, shift: 0 };

  const isLast = index === tokens.length - 1;
  // The edited word keeps whether it was followed by a space, so Latin and CJK
  // lines both join back exactly.
  const trailing = !isLast && /\s$/.test(token.text);
  const next = words.map((word, position): Token => {
    const spacedText = position === words.length - 1 ? spaced(word.text, trailing) : word.text;
    if (token.start === undefined) return { text: spacedText };
    // A word that has started but not ended keeps its start on the first word.
    if (token.end === undefined) return position === 0 ? { text: spacedText, start: token.start } : { text: spacedText };
    if (words.length === 1) return { text: spacedText, start: token.start, end: token.end };

    const [start, end] = splitSpan(token.start, token.end, words, position);
    return { text: spacedText, start, end };
  });

  const unchanged =
    next.length === 1 &&
    next[0].text === token.text &&
    next[0].start === token.start &&
    next[0].end === token.end;

  if (unchanged) return { tokens, shift: 0 };
  return {
    tokens: [...tokens.slice(0, index), ...next, ...tokens.slice(index + 1)],
    shift: next.length - 1,
  };
}

/** Where one of the words a token was split into starts and ends. */
function splitSpan(start: number, end: number, words: Token[], position: number): [number, number] {
  const span = Math.max(0, end - start);
  const weights = words.map((word) => Math.max(1, word.text.trim().length));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  const before = weights.slice(0, position).reduce((sum, weight) => sum + weight, 0);
  const after = before + weights[position];
  const from = start + (span * before) / total;
  const to = position === words.length - 1 ? end : start + (span * after) / total;
  return [roundTime(from), roundTime(Math.max(from, to))];
}
