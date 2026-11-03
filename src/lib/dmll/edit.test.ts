import { describe, expect, it } from "vitest";

import { setTokenText } from "./edit";
import { tokenize } from "./tokenize";
import type { Token } from "./types";

/** A line's tokens with each one timed from `starts`, in order. */
function timed(text: string, starts: number[]): Token[] {
  return tokenize(text).map((token, index) => ({
    ...token,
    start: starts[index],
    end: starts[index + 1],
  }));
}

const joined = (tokens: Token[]): string => tokens.map((token) => token.text).join("");

describe("setTokenText", () => {
  it("renames a word without touching its timing", () => {
    const tokens = timed("Drugs numb", [0.8, 1.07, 1.8]);
    const edit = setTokenText(tokens, 1, "NUMB");

    expect(edit.tokens).toEqual([
      { text: "Drugs ", start: 0.8, end: 1.07 },
      { text: "NUMB", start: 1.07, end: 1.8 },
    ]);
    expect(edit.shift).toBe(0);
    expect(joined(edit.tokens)).toBe("Drugs NUMB");
  });

  it("splits its span when a word becomes several words", () => {
    const tokens = timed("one two three", [1, 2, 3, 4]);
    const edit = setTokenText(tokens, 1, "two and a half");

    expect(edit.shift).toBe(3);
    expect(edit.tokens).toHaveLength(6);
    expect(joined(edit.tokens)).toBe("one two and a half three");

    const words = edit.tokens.slice(1, 5);
    expect(words.map((word) => word.text)).toEqual(["two ", "and ", "a ", "half "]);
    expect(words[0].start).toBe(2);
    expect(words.at(-1)?.end).toBe(3);
    // Every split word keeps its neighbour's start and stays inside the span.
    for (const [index, word] of words.entries()) {
      expect(word.start).toBeGreaterThanOrEqual(2);
      expect(word.end).toBeLessThanOrEqual(3);
      if (index > 0) expect(word.start).toBe(words[index - 1].end);
    }
  });

  it("keeps every word inside the word's own span, weighted by length", () => {
    const tokens = timed("a bbb", [0, 2, 4]);
    const edit = setTokenText(tokens, 1, "a bbb");

    expect(edit.tokens).toEqual([
      { text: "a ", start: 0, end: 2 },
      { text: "a ", start: 2, end: 2.5 },
      { text: "bbb", start: 2.5, end: 4 },
    ]);
  });

  it("splits a CJK run into one token per character", () => {
    const tokens = timed("你好世界", [1, 1.5, 2, 2.5, 3]);
    const edit = setTokenText(tokens, 0, "我来了");

    expect(edit.tokens.map((token) => token.text)).toEqual(["我", "来", "了", "好", "世", "界"]);
    expect(edit.shift).toBe(2);
    expect(edit.tokens[0].start).toBe(1);
    expect(edit.tokens[2].end).toBe(1.5);
    expect(edit.tokens[3]).toMatchObject({ start: 1.5, end: 2 });
  });

  it("leaves the split words untimed when the word was untimed", () => {
    const tokens = tokenize("one");
    const edit = setTokenText(tokens, 0, "one two");

    expect(edit.tokens).toEqual([{ text: "one " }, { text: "two" }]);
  });

  it("keeps the start of a word that is still open", () => {
    const tokens: Token[] = [{ text: "hello world", start: 3 }];
    const edit = setTokenText(tokens, 0, "hello there world");

    expect(edit.tokens).toEqual([
      { text: "hello ", start: 3 },
      { text: "there " },
      { text: "world" },
    ]);
  });

  it("refuses an edit that would leave the word empty", () => {
    const tokens = timed("one two", [1, 2, 3]);
    expect(setTokenText(tokens, 0, "   ").tokens).toBe(tokens);
    expect(setTokenText(tokens, 0, "").shift).toBe(0);
  });

  it("returns the same tokens when the text did not change", () => {
    const tokens = timed("one two", [1, 2, 3]);
    expect(setTokenText(tokens, 1, "two").tokens).toBe(tokens);
    expect(setTokenText(tokens, 1, "  two  ").tokens).toBe(tokens);
  });

  it("keeps the last word of a line free of a trailing space", () => {
    const tokens = timed("hello world", [1, 2, 3]);
    const edit = setTokenText(tokens, 1, "big world");

    expect(edit.tokens.map((token) => token.text)).toEqual(["hello ", "big ", "world"]);
  });
});
