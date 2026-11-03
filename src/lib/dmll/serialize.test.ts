import { describe, expect, it } from "vitest";

import { mergeLyrics } from "./merge";
import { parseLyrics } from "./parse";
import { serializeLyrics, toLrcText } from "./serialize";
import { lineAt } from "./test-helpers";
import type { Lyrics } from "./types";

describe("serializeLyrics", () => {
  it("writes word-timed lines, ad-libs and voice blocks in the spec's shape", () => {
    const source = `[dmll:1]

[00:00.80] {00:00.80~00:01.07}Drugs {00:01.07~00:01.31}got {00:01.31~00:01.54}me {00:01.54~00:01.80}numb
[ad:00:03.21] {00:03.21~00:03.44}Drugs {00:03.44~00:03.65}got {00:03.65~00:03.85}me {00:03.85~00:04.07}numb

[00:04.09] Drugs got me numb

[v:right]
[00:34.62] {00:34.62~00:34.88}What {00:34.88~00:35.12}you
[ad:00:40.75] {00:40.75~00:40.98}Hahahahahaha
`;

    expect(serializeLyrics(parseLyrics(source))).toBe(source);
  });

  it("round-trips through the parser without changing the lyrics", () => {
    const source = "[00:01.00][00:05.00] {00:01.00~00:01.50}one {00:01.50~00:02.00}two\n[v:right]\n[00:09.00] plain";
    const once = parseLyrics(source);

    const text = serializeLyrics(once);
    const withoutBlanks = (lyrics: Lyrics) => lyrics.filter((entry) => entry.kind !== "blank");

    // Writing is a fixed point, and the lines survive; blank rows may differ
    // because the writer adds one before a voice directive.
    expect(serializeLyrics(parseLyrics(text))).toBe(text);
    expect(withoutBlanks(parseLyrics(text))).toEqual(withoutBlanks(once));
  });

  it("writes a line with some words untimed as its line timestamp alone", () => {
    const lyrics: Lyrics = [
      {
        kind: "lyric",
        voice: "left",
        start: 1.5,
        tokens: [{ text: "Hi ", start: 1.5, end: 2 }, { text: "there" }],
      },
    ];

    expect(serializeLyrics(lyrics)).toBe("[dmll:1]\n\n[00:01.50] Hi there\n");
  });

  it("writes a voice directive only where the side changes", () => {
    const line = (start: number, voice: "left" | "right", text: string): Lyrics[number] => ({
      kind: "lyric",
      voice,
      start,
      tokens: [{ text }],
    });

    const output = serializeLyrics([line(1, "left", "a"), line(2, "right", "b"), line(3, "right", "c")]);

    expect(output).toBe("[dmll:1]\n\n[00:01.00] a\n\n[v:right]\n[00:02.00] b\n[00:03.00] c\n");
  });

  it("writes an ad-lib as plain text when the line above it is untimed", () => {
    const lyrics: Lyrics = [
      { kind: "lyric", voice: "left", start: 1, tokens: [{ text: "A" }] },
      { kind: "lyric", voice: "left", tokens: [{ text: "B" }] },
      { kind: "adlib", start: 3, tokens: [{ text: "C" }] },
    ];

    expect(serializeLyrics(lyrics)).toBe("[dmll:1]\n\n[00:01.00] A\nB\nC\n");
  });

  it("writes a repeated timestamp back as one line", () => {
    const source = "[dmll:1]\n\n[00:01.00][00:05.00] {00:01.00~00:01.50}one {00:01.50~00:02.00}two\n";

    expect(serializeLyrics(parseLyrics(source))).toBe(source);
  });

  it("writes the copies on separate lines once one of them is edited", () => {
    const lyrics = parseLyrics("[00:01.00][00:05.00] {00:01.00~00:01.50}one {00:01.50~00:02.00}two");
    const second = lineAt(lyrics, 1);
    const tokens = second.tokens.map((token, index) =>
      index === 0 ? { ...token, start: (token.start ?? 0) + 0.1 } : token,
    );
    const edited: Lyrics = [lineAt(lyrics, 0), { ...second, tokens }];

    expect(serializeLyrics(edited)).toBe(
      "[dmll:1]\n\n" +
        "[00:01.00] {00:01.00~00:01.50}one {00:01.50~00:02.00}two\n" +
        "[00:05.00] {00:05.10~00:05.50}one {00:05.50~00:06.00}two\n",
    );
  });

  it("writes comments and metadata tags back where they were", () => {
    const source = "[dmll:1]\n\n[ar:Playboi Carti]\n// a note\n\n[00:01.00] hello\n";

    expect(serializeLyrics(parseLyrics(source))).toBe(source);
  });
});

describe("toLrcText", () => {
  it("writes line timestamps, voices and ad-libs without word tokens", () => {
    const lyrics = parseLyrics(
      "[v:left]\n[00:01.00] {00:01.00~00:01.40}Hello {00:01.40~00:02.00}world\n[ad:00:02.50] (yeah)\n\n[v:right]\n[00:04.00] plain",
    );

    expect(toLrcText(lyrics)).toBe(
      "[00:01.00] Hello world\n[ad:00:02.50] (yeah)\n\n[v:right]\n[00:04.00] plain",
    );
  });

  it("keeps every line's time when the words are edited", () => {
    const original = parseLyrics("[00:01.00] old words\n[00:04.00] keep me");
    const merged = mergeLyrics(original, parseLyrics(toLrcText(original).replace("old words", "new words")));

    expect(lineAt(merged, 0)).toMatchObject({ start: 1 });
    expect(lineAt(merged, 1)).toMatchObject({ start: 4 });
  });

  it("keeps comments and tags in the edit text", () => {
    const lyrics = parseLyrics("[ar:X]\n// note\n[00:01.00] hello");

    expect(toLrcText(lyrics)).toBe("[ar:X]\n// note\n[00:01.00] hello");
  });

  it("keeps a repeated timestamp on one line", () => {
    expect(toLrcText(parseLyrics("[00:01.00][00:05.00] hi"))).toBe("[00:01.00][00:05.00] hi");
  });
});
