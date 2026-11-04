import { isLine, plainText, type LineEntry } from "./model";
import { roundTime } from "./time";
import type { Lyrics, Token, Voice } from "./types";

interface LineKey {
  index: number;
  key: string;
}

const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/** Timestamps are compared in centiseconds, the precision DMLL writes. */
const centi = (seconds: number) => Math.round(seconds * 100);

/** The lyrics as plain text, one line per row, blank rows kept. */
export function toPlainText(lyrics: Lyrics): string {
  return lyrics
    .map((entry) => {
      if (isLine(entry)) return plainText(entry.tokens);
      if (entry.kind === "comment" || entry.kind === "meta") return entry.text;
      return "";
    })
    .join("\n");
}

/** Whether any word of the line carries a time. */
function hasWordTiming(entry: LineEntry): boolean {
  return entry.tokens.some((token) => token.start !== undefined);
}

function shifted(tokens: Token[], delta: number): Token[] {
  if (delta === 0) return tokens;
  return tokens.map(({ text, start, end }) => ({
    text,
    start: start === undefined ? undefined : roundTime(start + delta),
    end: end === undefined ? undefined : roundTime(end + delta),
  }));
}

/**
 * Blends the new line with the timing of the old one it was recognised as.
 *
 * Word timing belongs to an exact line: it is kept only while the line's text
 * is identical, and then it moves with the line if the pasted timestamp moved
 * it. Text that carries word timing was written on purpose, so it wins. A line
 * whose words changed keeps its line timestamp and nothing finer.
 */
function adoptLine(old: LineEntry, next: LineEntry): LineEntry {
  const sameText = plainText(old.tokens) === plainText(next.tokens);
  const start = next.start ?? old.start;
  const group = next.kind === "lyric" ? next.group : undefined;

  const tokens = hasWordTiming(next)
    ? next.tokens
    : sameText
      ? shifted(old.tokens, start === undefined || old.start === undefined ? 0 : start - old.start)
      : next.tokens;

  // The group says how the source repeated the line, so it comes from the new
  // text even when the line's timing was adopted from the old one.
  if (old.kind === "lyric" && group !== undefined) return { ...old, start, tokens, group };
  return { ...old, start, tokens };
}

/**
 * Adopts the edited text `next` and keeps the timing, voice and ad-lib role of
 * every line it can recognise.
 *
 * Lines are matched by text first, with a longest common subsequence, so an
 * inserted line does not shift the rest. Lines whose text changed are then
 * matched by their timestamp: revising the wording of an LRC keeps its timing
 * as long as the timing itself did not change. When both versions hold the same
 * number of lines, the leftovers are paired in order, so a plain-text wording
 * edit keeps its line timestamp, voice and ad-lib role (the word timing still
 * goes, because the words changed).
 */
export function mergeLyrics(previous: Lyrics, next: Lyrics): Lyrics {
  const before = lineKeys(previous);
  const after = lineKeys(next);
  const adopted = new Map<number, number>();

  for (const [i, j] of commonLines(
    before.map((line) => line.key),
    after.map((line) => line.key),
  )) {
    adopted.set(after[j].index, before[i].index);
  }
  adoptByTimestamp(previous, next, adopted);
  adoptByPosition(previous, next, adopted);

  let voice: Voice = "left";
  return next.map((entry, index) => {
    if (!isLine(entry)) return entry;

    const from = adopted.get(index);
    const old = from === undefined ? undefined : previous[from];
    if (isLine(old)) {
      if (old.kind === "lyric") voice = old.voice;
      return adoptLine(old, entry);
    }

    // A new line takes the side of the block it was typed into.
    return entry.kind === "lyric" ? { ...entry, voice } : entry;
  });
}

/** Pairs a line whose text changed with the unused old line that starts at the same time. */
function adoptByTimestamp(previous: Lyrics, next: Lyrics, adopted: Map<number, number>): void {
  const taken = new Set(adopted.values());
  const byTime = new Map<number, number[]>();

  previous.forEach((entry, index) => {
    if (!isLine(entry) || entry.start === undefined || taken.has(index)) return;
    const key = centi(entry.start);
    byTime.set(key, [...(byTime.get(key) ?? []), index]);
  });

  next.forEach((entry, index) => {
    if (!isLine(entry) || entry.start === undefined || adopted.has(index)) return;
    const candidates = byTime.get(centi(entry.start));
    const match = candidates?.shift();
    if (match === undefined) return;
    adopted.set(index, match);
  });
}

function lineIndexes(lyrics: Lyrics): number[] {
  const indexes: number[] = [];
  lyrics.forEach((entry, index) => {
    if (isLine(entry)) indexes.push(index);
  });
  return indexes;
}

/** Pairs leftover lines by order when both versions hold the same line count. */
function adoptByPosition(previous: Lyrics, next: Lyrics, adopted: Map<number, number>): void {
  const before = lineIndexes(previous);
  const after = lineIndexes(next);
  if (before.length !== after.length) return;

  const takenOld = new Set(adopted.values());
  const freeOld = before.filter((index) => !takenOld.has(index));
  const freeNew = after.filter((index) => !adopted.has(index));
  if (freeOld.length !== freeNew.length) return;

  freeNew.forEach((index, position) => adopted.set(index, freeOld[position]));
}

function lineKeys(lyrics: Lyrics): LineKey[] {
  const keys: LineKey[] = [];
  lyrics.forEach((entry, index) => {
    if (isLine(entry)) keys.push({ index, key: normalize(plainText(entry.tokens)) });
  });
  return keys;
}

/** Pairs of positions in `a` and `b` that match, in order, as a longest common subsequence. */
function commonLines(a: string[], b: string[]): Array<[number, number]> {
  const length = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      length[i][j] = a[i] === b[j] ? length[i + 1][j + 1] + 1 : Math.max(length[i + 1][j], length[i][j + 1]);
    }
  }

  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (length[i + 1][j] >= length[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}
