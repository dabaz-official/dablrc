import { describe, expect, it } from "vitest";

import type { Token } from "./types";
import { syncWordTimings, wordIndexAt, type WordSample } from "./word-sync";

const words = (...texts: string[]): Token[] => texts.map((text) => ({ text }));

const start = (token: Token) => token.start;
const end = (token: Token) => token.end;

describe("wordIndexAt", () => {
  it("puts the pill in one slot at a time and reaches the last slot at the end", () => {
    expect(wordIndexAt(0, 3)).toBe(0);
    expect(wordIndexAt(0.49, 3)).toBe(0);
    expect(wordIndexAt(0.5, 3)).toBe(1);
    expect(wordIndexAt(0.99, 3)).toBe(1);
    expect(wordIndexAt(1, 3)).toBe(2);
    expect(wordIndexAt(0.7, 1)).toBe(0);
  });
});

describe("syncWordTimings", () => {
  it("starts each word when the pill reaches its slot and ends the previous one", () => {
    const samples: WordSample[] = [
      { progress: 0, time: 3 },
      { progress: 0.5, time: 4 },
      { progress: 1, time: 5.5 },
    ];
    const tokens = syncWordTimings(words("one ", "two ", "three"), samples, { finalize: true, endTime: 6 });

    expect(tokens).toEqual([
      { text: "one ", start: 3, end: 4 },
      { text: "two ", start: 4, end: 5.5 },
      { text: "three", start: 5.5, end: 6 },
    ]);
  });

  it("interpolates when one move crosses several words", () => {
    const tokens = syncWordTimings(words("one ", "two ", "three"), [
      { progress: 0, time: 3 },
      { progress: 1, time: 5 },
    ], { finalize: true });

    expect(tokens.map(start)).toEqual([3, 4, 5]);
    expect(tokens.map(end)).toEqual([4, 5, 5]);
  });

  it("never moves backwards when the pointer or the clock does", () => {
    const tokens = syncWordTimings(words("one ", "two ", "three"), [
      { progress: 0, time: 3 },
      { progress: 0.8, time: 4.2 },
      { progress: 0.4, time: 3.5 },
      { progress: 1, time: 5 },
    ], { finalize: true });

    expect(tokens.map(start)).toEqual([3, 3.75, 5]);
    expect(tokens.every((token) => token.start !== undefined && (token.end ?? 0) >= token.start)).toBe(true);
  });

  it("keeps the start a continuing gesture already has", () => {
    const tokens = syncWordTimings(
      [{ text: "one ", start: 2.5 }],
      [{ progress: 0, time: 3 }, { progress: 1, time: 4 }],
      { finalize: true },
    );

    expect(tokens).toEqual([{ text: "one ", start: 2.5, end: 4 }]);
  });

  it("handles a one-word line and an early release", () => {
    const open = syncWordTimings(words("only"), [
      { progress: 0, time: 3 },
      { progress: 1, time: 4 },
    ]);
    expect(open).toEqual([{ text: "only", start: 3 }]);

    const closed = syncWordTimings(words("only"), [
      { progress: 0, time: 3 },
      { progress: 1, time: 4 },
    ], { finalize: true });
    expect(closed).toEqual([{ text: "only", start: 3, end: 4 }]);
  });

  it("does not touch a word the gesture never reached", () => {
    const tokens = syncWordTimings(words("one ", "two ", "three"), [
      { progress: 0, time: 3 },
      { progress: 0.5, time: 4 },
    ], { finalize: true });

    expect(tokens[0]).toEqual({ text: "one ", start: 3, end: 4 });
    expect(tokens[1]).toEqual({ text: "two ", start: 4, end: 4 });
    expect(tokens[2]).toEqual({ text: "three" });
  });
});
