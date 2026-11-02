import type { Token } from "./types";

const SPACE = /\s/;
const PUNCTUATION = /\p{P}/u;
/** Scripts written without spaces between words: one token per character. */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/**
 * Splits a line into the tokens DMLL times. Latin words split on spaces, each
 * CJK character is a token of its own, and punctuation stays with the word
 * before it. A token keeps the space that follows it, so the tokens joined
 * together give back the line.
 */
export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let current = "";
  let previous = "";
  let spaced = false;

  for (const char of line.trim()) {
    if (SPACE.test(char)) {
      if (current && !spaced) current += " ";
      spaced = true;
      continue;
    }
    if (
      current &&
      (spaced || CJK.test(char) || (CJK.test(previous) && !PUNCTUATION.test(char)))
    ) {
      tokens.push({ text: current });
      current = "";
    }
    current += char;
    previous = char;
    spaced = false;
  }
  if (current) tokens.push({ text: current });
  return tokens;
}
