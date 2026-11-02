import { describe, expect, it } from "vitest";

import { parseLyrics } from "./parse";
import { summarize } from "./model";
import { EMPTY_HISTORY, historyReducer, type Action, type History } from "./sync";
import { lineAt } from "./test-helpers";

const start = (text: string): History =>
  historyReducer(EMPTY_HISTORY, { type: "replace", lyrics: parseLyrics(text) });

const run = (history: History, ...actions: Action[]): History =>
  actions.reduce((state, action) => historyReducer(state, action), history);

const tap = (time: number): Action => ({ type: "tap", time, mode: "word" });

/** The line at `index` in the present state. */
const line = (history: History, index: number) => lineAt(history.present.lyrics, index);

describe("word sync", () => {
  it("starts each word at its tap and ends it at the next tap", () => {
    const history = run(
      start("Drugs got me numb"),
      tap(0.8),
      tap(1.07),
      tap(1.31),
      tap(1.54),
      { type: "closeLine", time: 1.8 },
    );

    expect(line(history, 0)).toMatchObject({
      start: 0.8,
      tokens: [
        { text: "Drugs ", start: 0.8, end: 1.07 },
        { text: "got ", start: 1.07, end: 1.31 },
        { text: "me ", start: 1.31, end: 1.54 },
        { text: "numb", start: 1.54, end: 1.8 },
      ],
    });
  });

  it("leaves a gap when a word is ended early with endWord", () => {
    const history = run(start("Drugs got"), tap(0.8), { type: "endWord", time: 0.95 }, tap(1.2), {
      type: "closeLine",
      time: 1.5,
    });

    expect(line(history, 0).tokens).toEqual([
      { text: "Drugs ", start: 0.8, end: 0.95 },
      { text: "got", start: 1.2, end: 1.5 },
    ]);
  });

  it("ends the last word when there is no next word to stamp", () => {
    // A one-word line: the second tap is the word's end, not a no-op.
    const single = run(start("Woah"), tap(1), tap(1.5));
    expect(line(single, 0).tokens).toEqual([{ text: "Woah", start: 1, end: 1.5 }]);
    expect(summarize(single.present.lyrics)).toMatchObject({ wordSynced: 1, partial: 0, lineOnly: 0 });

    // A two-word line: the third tap ends the last word and stays on the line.
    const pair = run(start("one two"), tap(1), tap(1.4), tap(1.8));
    expect(line(pair, 0).tokens).toEqual([
      { text: "one ", start: 1, end: 1.4 },
      { text: "two", start: 1.4, end: 1.8 },
    ]);
    expect(summarize(pair.present.lyrics)).toMatchObject({ wordSynced: 1, partial: 0 });
    expect(pair.present.active).toBe(0);
  });

  it("moves on to the next line when a line is closed", () => {
    const history = run(start("one two\nthree"), tap(1), tap(1.4), { type: "closeLine", time: 1.8 });

    expect(history.present.active).toBe(1);
    expect(history.present.cursor).toBe(0);
  });

  it("undoes the last tap, cursor included", () => {
    const history = run(start("one two three"), tap(1), tap(1.4), { type: "undo" });

    expect(history.present.cursor).toBe(1);
    expect(line(history, 0).tokens[1].start).toBeUndefined();
  });

  it("nudges and re-stamps the selected word", () => {
    const history = run(start("one two"), tap(1), tap(1.4), { type: "nudge", edge: "start", delta: -0.05 });

    expect(line(history, 0).tokens[1].start).toBeCloseTo(1.35, 5);

    const restamped = run(history, { type: "restamp", edge: "end", time: 1.6 });
    expect(line(restamped, 0).tokens[1].end).toBe(1.6);
  });
});

describe("line mode", () => {
  it("stamps only line starts and moves on each time", () => {
    const history = run(
      start("first\nsecond"),
      { type: "tap", time: 0.5, mode: "line" },
      { type: "tap", time: 4, mode: "line" },
    );

    expect(line(history, 0)).toMatchObject({ start: 0.5 });
    expect(line(history, 1)).toMatchObject({ start: 4 });
    expect(line(history, 1).tokens[0].start).toBeUndefined();
    expect(history.present.active).toBe(-1);
  });
});

describe("estimate", () => {
  it("spreads a timed line over the time up to the next timed line", () => {
    const history = run(
      start("Hi there\nYou"),
      { type: "tap", time: 1, mode: "line" },
      { type: "tap", time: 3, mode: "line" },
      { type: "estimate" },
    );
    const [hi, there] = line(history, 0).tokens;

    expect(hi.start).toBe(1);
    expect(hi.end).toBeCloseTo(1.57, 2);
    expect(there.start).toBeCloseTo(1.57, 2);
    expect(there.end).toBe(3);
  });
});

describe("ad-libs and voices", () => {
  it("turns a line into an ad-lib only when a lyric line sits above it", () => {
    const history = run(start("A\nB"), { type: "toggleAdlib", entry: 0 }, { type: "toggleAdlib", entry: 1 });

    expect(line(history, 0).kind).toBe("lyric");
    expect(line(history, 1).kind).toBe("adlib");
  });

  it("flips a lyric line between the left and right sides", () => {
    const history = run(start("A"), { type: "toggleVoice", entry: 0 });

    expect(line(history, 0)).toMatchObject({ voice: "right" });
  });
});
