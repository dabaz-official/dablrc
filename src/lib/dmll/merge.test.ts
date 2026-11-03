import { describe, expect, it } from "vitest";

import { mergeLyrics, toPlainText } from "./merge";
import { parseLyrics } from "./parse";
import { toLrcText } from "./serialize";
import { lineAt } from "./test-helpers";

describe("mergeLyrics", () => {
  it("keeps timing for unchanged lines when text is edited around them", () => {
    const previous = parseLyrics("[00:01.00] A\n[v:right]\n[00:02.00] B");
    const merged = mergeLyrics(previous, parseLyrics("A\nNew line\nB"));

    expect(lineAt(merged, 0)).toMatchObject({ start: 1, voice: "left" });
    expect(lineAt(merged, 1)).toMatchObject({ kind: "lyric", tokens: [{ text: "New " }, { text: "line" }] });
    expect(lineAt(merged, 1).start).toBeUndefined();
    expect(lineAt(merged, 2)).toMatchObject({ start: 2, voice: "right" });
  });

  it("keeps the ad-lib role of a line whose text is unchanged", () => {
    const previous = parseLyrics("[00:01.00] A\n[ad:00:01.50] x");
    const merged = mergeLyrics(previous, parseLyrics("A\nx"));

    expect(lineAt(merged, 1)).toMatchObject({ kind: "adlib", start: 1.5 });
  });

  it("keeps the word timing of an unchanged line when an LRC is pasted", () => {
    const previous = parseLyrics("[00:01.00] {00:01.00~00:01.50}Hello {00:01.50~00:02.00}world");
    const merged = mergeLyrics(previous, parseLyrics("[00:01.00] Hello world"));

    expect(lineAt(merged, 0)).toMatchObject({
      start: 1,
      tokens: [
        { text: "Hello ", start: 1, end: 1.5 },
        { text: "world", start: 1.5, end: 2 },
      ],
    });
  });

  it("moves the word timing with a line whose timestamp changed", () => {
    const previous = parseLyrics("[00:01.00] {00:01.00~00:01.50}Hello {00:01.50~00:02.00}world");
    const merged = mergeLyrics(previous, parseLyrics("[00:01.25] Hello world"));

    expect(lineAt(merged, 0)).toMatchObject({
      start: 1.25,
      tokens: [
        { text: "Hello ", start: 1.25, end: 1.75 },
        { text: "world", start: 1.75, end: 2.25 },
      ],
    });
  });

  it("keeps a line's timestamp when only its case or spacing is revised", () => {
    const previous = parseLyrics("[00:01.00] Hello world");
    const merged = mergeLyrics(previous, parseLyrics("hello world"));

    expect(lineAt(merged, 0)).toMatchObject({ start: 1 });
    expect(lineAt(merged, 0).tokens.map((token) => token.text).join("")).toBe("hello world");
  });

  it("matches a revised LRC line by its timestamp", () => {
    const previous = parseLyrics("[00:01.00] old words\n[00:04.00] keep me");
    const merged = mergeLyrics(previous, parseLyrics("[00:01.00] new words\n[00:04.00] keep me"));

    expect(lineAt(merged, 0)).toMatchObject({ start: 1 });
    expect(lineAt(merged, 0).tokens.map((token) => token.text).join("")).toBe("new words");
    expect(lineAt(merged, 1)).toMatchObject({ start: 4 });
  });

  it("drops word timing when a line's words change, keeping the line timestamp", () => {
    const previous = parseLyrics("[00:01.00] {00:01.00~00:01.50}Hello {00:01.50~00:02.00}world");
    const merged = mergeLyrics(previous, parseLyrics("hello world"));

    expect(lineAt(merged, 0).start).toBe(1);
    expect(lineAt(merged, 0).tokens.every((token) => token.start === undefined)).toBe(true);
  });

  it("takes pasted word timing over the timing already on the line", () => {
    const previous = parseLyrics("[00:01.00] {00:01.00~00:01.50}Hello {00:01.50~00:02.00}world");
    const merged = mergeLyrics(previous, parseLyrics("[00:01.00] {00:01.00~00:01.20}Hello {00:01.20~00:01.90}world"));

    expect(lineAt(merged, 0).tokens).toEqual([
      { text: "Hello ", start: 1, end: 1.2 },
      { text: "world", start: 1.2, end: 1.9 },
    ]);
  });

  it("keeps voices across a revised LRC", () => {
    const previous = parseLyrics("[v:right]\n[00:02.00] a");
    const merged = mergeLyrics(previous, parseLyrics("[00:02.00] a"));

    expect(lineAt(merged, 0)).toMatchObject({ voice: "right" });
  });

  it("keeps comments and tags when the text is re-applied unchanged", () => {
    const previous = parseLyrics("[ar:X]\n// note\n[00:01.00] hello");
    const merged = mergeLyrics(previous, parseLyrics(toLrcText(previous)));

    expect(merged.map((entry) => entry.kind)).toEqual(["meta", "comment", "lyric"]);
    expect(lineAt(merged, 2).start).toBe(1);
  });

  it("takes the grouping of a repeated timestamp from the new text", () => {
    const previous = parseLyrics("[00:01.00] old words");
    const merged = mergeLyrics(previous, parseLyrics("[00:01.00][00:05.00] one two"));

    expect(toLrcText(merged)).toBe("[00:01.00][00:05.00] one two");
  });
});

describe("toPlainText", () => {
  it("writes one line per row and blank rows as empty lines", () => {
    expect(toPlainText(parseLyrics("[00:01.00] A\n\n[00:02.00] B"))).toBe("A\n\nB");
  });
});
