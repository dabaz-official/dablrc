import { describe, expect, it } from "vitest";

import { lineNumbers, nextLine, previousLine } from "./model";
import type { Lyrics } from "./types";

const lyrics: Lyrics = [
  { kind: "comment", text: "// a note" },
  { kind: "lyric", voice: "left", start: 1, tokens: [{ text: "one" }] },
  { kind: "blank" },
  { kind: "adlib", start: 2, tokens: [{ text: "two" }] },
  { kind: "meta", text: "[ar:Artist]" },
  { kind: "lyric", voice: "right", start: 3, tokens: [{ text: "three" }] },
];

describe("line navigation", () => {
  it("skips blanks, comments, tags and ad-libs", () => {
    expect(nextLine(lyrics, -1)).toBe(1);
    expect(nextLine(lyrics, 1)).toBe(3);
    expect(nextLine(lyrics, 3)).toBe(5);
    expect(nextLine(lyrics, 5)).toBe(-1);

    expect(previousLine(lyrics, 5)).toBe(3);
    expect(previousLine(lyrics, 3)).toBe(1);
    expect(previousLine(lyrics, 1)).toBe(-1);
    expect(previousLine(lyrics, 0)).toBe(-1);
  });

  it("numbers only lyric lines", () => {
    expect(lineNumbers(lyrics)).toEqual([undefined, 1, undefined, undefined, undefined, 2]);
  });
});
