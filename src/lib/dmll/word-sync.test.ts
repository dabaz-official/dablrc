import { describe, expect, it } from "vitest";

import type { Token } from "./types";
import { syncWordTimings, wordBoundaries, wordIndexAt, type WordSample } from "./word-sync";

const words = (...texts: string[]): Token[] => texts.map((text) => ({ text }));

const start = (token: Token) => token.start;
const end = (token: Token) => token.end;

describe("wordBoundaries", () => {
  it("splits the line by the words' text length", () => {
    expect(wordBoundaries(words("a", "bbb"))).toEqual([0, 0.25, 1]);
    expect(wordBoundaries(words("only"))).toEqual([0, 1]);
    expect(wordBoundaries([])).toEqual([0]);
  });
});

describe("wordIndexAt", () => {
  it("returns the word whose start boundary the cursor passed", () => {
    const boundaries = [0, 1 / 3, 2 / 3, 1];
    expect(wordIndexAt(0, boundaries)).toBe(0);
    expect(wordIndexAt(0.3, boundaries)).toBe(0);
    expect(wordIndexAt(0.34, boundaries)).toBe(1);
    expect(wordIndexAt(0.7, boundaries)).toBe(2);
    expect(wordIndexAt(1, boundaries)).toBe(2);
  });
});

describe("syncWordTimings", () => {
  it("starts each word at its boundary and ends the previous one there", () => {
    const samples: WordSample[] = [
      { progress: 0, time: 3 },
      { progress: 1 / 3, time: 4 },
      { progress: 1, time: 5.5 },
    ];
    const tokens = syncWordTimings(words("aaa ", "bbb ", "ccc"), samples, { finalize: true, endTime: 6 });

    expect(tokens).toEqual([
      { text: "aaa ", start: 3, end: 4 },
      { text: "bbb ", start: 4, end: 4.75 },
      { text: "ccc", start: 4.75, end: 6 },
    ]);
  });

  it("interpolates when one move crosses several boundaries", () => {
    const tokens = syncWordTimings(words("aaa ", "bbb ", "ccc"), [
      { progress: 0, time: 3 },
      { progress: 1, time: 5 },
    ], { finalize: true });

    expect(tokens.map(start)).toEqual([3, 3.67, 4.33]);
    expect(tokens.map(end)).toEqual([3.67, 4.33, 5]);
  });

  it("never moves backwards when the pointer or the clock does", () => {
    const tokens = syncWordTimings(words("aaa ", "bbb ", "ccc"), [
      { progress: 0, time: 3 },
      { progress: 0.5, time: 4.2 },
      { progress: 0.4, time: 3.5 },
      { progress: 1, time: 5 },
    ], { finalize: true });

    expect(tokens.map(start)).toEqual([3, 3.8, 4.47]);
    expect(tokens.every((token) => token.start !== undefined && (token.end ?? 0) >= token.start)).toBe(true);
  });

  it("keeps the start a continuing gesture already has", () => {
    const tokens = syncWordTimings(
      [{ text: "only", start: 2.5 }],
      [{ progress: 0, time: 3 }, { progress: 1, time: 4 }],
      { finalize: true },
    );

    expect(tokens).toEqual([{ text: "only", start: 2.5, end: 4 }]);
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
    const tokens = syncWordTimings(words("aaa ", "bbb ", "ccc"), [
      { progress: 0, time: 3 },
      { progress: 0.5, time: 4 },
    ], { finalize: true });

    expect(tokens[0]).toEqual({ text: "aaa ", start: 3, end: 3.67 });
    expect(tokens[1]).toEqual({ text: "bbb ", start: 3.67, end: 4 });
    expect(tokens[2]).toEqual({ text: "ccc" });
  });
});
