import { describe, expect, it } from "vitest";

import { isTimedSource, parseLyrics } from "./parse";
import { lineAt } from "./test-helpers";

/** The quick reference from docs/dmll-format.md, section 1. */
const SPEC = `[dmll:1]

// Whole-line comment.
[v:left]
[00:00.80] {00:00.80~00:01.07}Drugs {00:01.07~00:01.31}got {00:01.31~00:01.54}me {00:01.54~00:01.80}numb
[ad:00:03.21] {00:03.21~00:03.44}Drugs {00:03.44~00:03.65}got {00:03.65~00:03.85}me {00:03.85~00:04.07}numb

[00:04.09] Drugs got me numb

[v:right]
[00:34.62] {00:34.62~00:34.88}What {00:34.88~00:35.12}you {00:35.12~00:35.36}are
[ad:00:40.75] {00:40.75~00:40.98}Hahahahahaha
`;

describe("parseLyrics", () => {
  it("reads word-timed lines, ad-libs, blanks and voices", () => {
    const lyrics = parseLyrics(SPEC);

    expect(lyrics.map((entry) => entry.kind)).toEqual([
      "comment",
      "lyric",
      "adlib",
      "blank",
      "lyric",
      "blank",
      "lyric",
      "adlib",
    ]);

    const lead = lineAt(lyrics, 1);
    expect(lead).toMatchObject({ kind: "lyric", voice: "left", start: 0.8 });
    expect(lead.tokens).toHaveLength(4);
    expect(lead.tokens[0]).toMatchObject({ text: "Drugs ", start: 0.8, end: 1.07 });
    expect(lineAt(lyrics, 2)).toMatchObject({ kind: "adlib", start: 3.21 });
    expect(lineAt(lyrics, 2).tokens[3]).toMatchObject({ text: "numb", start: 3.85, end: 4.07 });
    expect(lineAt(lyrics, 6)).toMatchObject({ kind: "lyric", voice: "right", start: 34.62 });
    expect(lyrics[0]).toEqual({ kind: "comment", text: "// Whole-line comment." });
  });

  it("keeps a line with a timestamp but no word tags as line-level text", () => {
    const line = lineAt(parseLyrics("[00:04.09] Drugs got me numb"), 0);

    expect(line.start).toBe(4.09);
    expect(line.tokens.map((token) => token.text)).toEqual(["Drugs ", "got ", "me ", "numb"]);
    expect(line.tokens.every((token) => token.start === undefined)).toBe(true);
  });

  it("keeps untimed lines as static text", () => {
    const line = lineAt(parseLyrics("Hello world"), 0);

    expect(line).toMatchObject({ kind: "lyric", voice: "left" });
    expect(line.start).toBeUndefined();
  });

  it("gives a repeated timestamp its own copy of the words, shifted and grouped", () => {
    const lyrics = parseLyrics("[00:12.34][00:20.00] {00:12.34~00:12.80}one {00:12.80~00:13.10}two");
    const repeat = lineAt(lyrics, 1);

    expect(lyrics).toHaveLength(2);
    expect(repeat.start).toBe(20);
    expect(repeat.tokens[0].start).toBeCloseTo(20, 5);
    expect(repeat.tokens[0].end).toBeCloseTo(20.46, 5);
    expect(repeat.tokens[1].end).toBeCloseTo(20.76, 5);
    const [lead, copy] = lyrics;
    if (lead.kind !== "lyric" || copy.kind !== "lyric") throw new Error("expected two lyric lines");
    expect(lead.group).toBeDefined();
    expect(lead.group).toBe(copy.group);
  });

  it("times text before the first tag from the line timestamp", () => {
    const line = lineAt(parseLyrics("[00:00.80] Drugs {00:01.00~00:01.40}got"), 0);

    expect(line.tokens[0]).toMatchObject({ text: "Drugs ", start: 0.8, end: 1 });
    expect(line.tokens[1]).toMatchObject({ text: "got", start: 1, end: 1.4 });
  });

  it("reads the legacy duet form as a line with an ad-lib under it", () => {
    const lyrics = parseLyrics(">> [00:01.00] Drugs got me numb | [00:03.00] Drugs got me numb");

    expect(lineAt(lyrics, 0)).toMatchObject({ kind: "lyric", start: 1 });
    expect(lineAt(lyrics, 1)).toMatchObject({ kind: "adlib", start: 3 });
  });

  it("keeps comments and metadata tags, and drops a timed line with no text", () => {
    const lyrics = parseLyrics("[ti:Title]\n// a note\n[00:01.00]\n[00:02.00] ok");

    expect(lyrics.map((entry) => entry.kind)).toEqual(["meta", "comment", "lyric"]);
    expect(lyrics[0]).toEqual({ kind: "meta", text: "[ti:Title]" });
    expect(lyrics[1]).toEqual({ kind: "comment", text: "// a note" });
    expect(lineAt(lyrics, 2).start).toBe(2);
  });

  it("keeps an offset tag without shifting the times, as the site does", () => {
    const lyrics = parseLyrics("[offset:+500]\n[00:01.00] later");

    expect(lyrics[0]).toEqual({ kind: "meta", text: "[offset:+500]" });
    expect(lineAt(lyrics, 1).start).toBe(1);
  });

  it("regenerates the version header instead of keeping it", () => {
    const lyrics = parseLyrics("[dmll:99]\n[00:01.00] a");

    expect(lyrics.map((entry) => entry.kind)).toEqual(["lyric"]);
  });

  it("drops a byte-order mark instead of putting it in the first line", () => {
    const line = lineAt(parseLyrics("\uFEFF[00:01.00] first line"), 0);

    expect(line.start).toBe(1);
    expect(line.tokens[0].text).toBe("first ");
  });
});

describe("isTimedSource", () => {
  it("tells timed source from plain lyrics", () => {
    expect(isTimedSource("[00:01.00] a")).toBe(true);
    expect(isTimedSource("[dmll:1]\n\nhello")).toBe(true);
    expect(isTimedSource("Drugs got me numb")).toBe(false);
  });
});
