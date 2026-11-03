import { isLine, parentOf, plainText } from "./model";
import { formatTime } from "./time";
import type { Lyrics, LyricEntry, Token, Voice } from "./types";

/** Entries that came from one multi-timestamp line, while they are still adjacent. */
function groupAt(lyrics: Lyrics, index: number, first: LyricEntry): LyricEntry[] {
  if (first.group === undefined) return [first];

  const group = [first];
  for (let next = index + 1; next < lyrics.length; next++) {
    const entry = lyrics[next];
    if (entry.kind !== "lyric" || entry.group !== first.group) break;
    group.push(entry);
  }
  return group;
}

const centi = (seconds: number | undefined) => (seconds === undefined ? undefined : Math.round(seconds * 100));

/**
 * Whether the copies of a multi-timestamp line still hold the same words at the
 * same offsets. Any edit to one copy breaks this, and they are written as
 * separate lines instead.
 */
function repeats(group: LyricEntry[]): boolean {
  const first = group[0];
  const start = first.start;
  if (start === undefined) return false;
  const text = plainText(first.tokens);

  return group.slice(1).every((entry) => {
    if (entry.start === undefined || entry.voice !== first.voice) return false;
    if (entry.tokens.length !== first.tokens.length || plainText(entry.tokens) !== text) return false;

    const delta = entry.start - start;
    return entry.tokens.every((token, index) => {
      const base = first.tokens[index];
      return (
        token.text === base.text &&
        centi(token.start) === centi(base.start === undefined ? undefined : base.start + delta) &&
        centi(token.end) === centi(base.end === undefined ? undefined : base.end + delta)
      );
    });
  });
}

/** The timestamps of a line, written as `[t1][t2]`. */
function timesOf(starts: number[]): string {
  return starts.map((start) => `[${formatTime(start)}]`).join("");
}

/** `{s~e}word …`, or plain text when the words are not all timed. */
function bodyOf(tokens: Token[]): string {
  return wordsOf(tokens) ?? plainText(tokens);
}

/**
 * Writes lyrics as a DMLL file. A line is word-timed only when every word has
 * both times; a partly timed line keeps just its line timestamp, and an untimed
 * line is plain text. An ad-lib under an untimed line is plain text too, since
 * DMLL would otherwise attach it to an earlier line.
 *
 * Comments and metadata tags are written back where they were. A multi-timestamp
 * line is written as one line while its copies still match.
 */
export function serializeLyrics(lyrics: Lyrics): string {
  const out = ["[dmll:1]", ""];
  let voice: Voice = "left";
  let index = 0;

  while (index < lyrics.length) {
    const entry = lyrics[index];
    let step = 1;

    if (entry.kind === "blank") {
      if (out[out.length - 1] !== "") out.push("");
    } else if (entry.kind === "comment" || entry.kind === "meta") {
      out.push(entry.text);
    } else if (entry.kind === "adlib") {
      const text = plainText(entry.tokens);
      if (text) {
        const parent = lyrics[parentOf(lyrics, index)];
        const attaches = isLine(parent) && parent.start !== undefined;
        out.push(attaches && entry.start !== undefined ? `[ad:${formatTime(entry.start)}] ${bodyOf(entry.tokens)}` : text);
      }
    } else if (plainText(entry.tokens)) {
      const group = groupAt(lyrics, index, entry);
      const repeat = group.length > 1 && repeats(group);
      if (repeat) step = group.length;

      if (entry.voice !== voice) {
        if (out[out.length - 1] !== "") out.push("");
        out.push(`[v:${entry.voice}]`);
        voice = entry.voice;
      }

      if (entry.start === undefined) out.push(plainText(entry.tokens));
      else if (repeat) out.push(`${timesOf(group.map((item) => item.start as number))} ${bodyOf(entry.tokens)}`);
      else out.push(`${timesOf([entry.start])} ${bodyOf(entry.tokens)}`);
    }

    index += step;
  }

  while (out[out.length - 1] === "") out.pop();
  return `${out.join("\n")}\n`;
}

/**
 * Writes the lyrics as LRC-shaped text for the edit box: one `[mm:ss.xx] text`
 * line each, voice directives, ad-libs, comments and tags kept, no word tokens.
 *
 * A timestamp stays on its line while the words are edited, so applying the
 * text keeps every line's time.
 */
export function toLrcText(lyrics: Lyrics): string {
  const out: string[] = [];
  let voice: Voice = "left";
  let index = 0;

  while (index < lyrics.length) {
    const entry = lyrics[index];
    let step = 1;

    if (entry.kind === "blank") {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
    } else if (entry.kind === "comment" || entry.kind === "meta") {
      out.push(entry.text);
    } else if (entry.kind === "adlib") {
      const text = plainText(entry.tokens);
      if (text) {
        const parent = lyrics[parentOf(lyrics, index)];
        const attaches = isLine(parent) && parent.start !== undefined;
        out.push(attaches && entry.start !== undefined ? `[ad:${formatTime(entry.start)}] ${text}` : text);
      }
    } else {
      const group = groupAt(lyrics, index, entry);
      const repeat = group.length > 1 && repeats(group);
      if (repeat) step = group.length;

      const text = plainText(entry.tokens);
      if (text) {
        if (entry.voice !== voice) {
          if (out.length > 0 && out[out.length - 1] !== "") out.push("");
          out.push(`[v:${entry.voice}]`);
          voice = entry.voice;
        }
        if (entry.start === undefined) out.push(text);
        else if (repeat) out.push(`${timesOf(group.map((item) => item.start as number))} ${text}`);
        else out.push(`[${formatTime(entry.start)}] ${text}`);
      }
    }

    index += step;
  }

  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}

function wordsOf(tokens: Token[]): string | undefined {
  let words = "";
  for (const { text, start, end } of tokens) {
    if (start === undefined || end === undefined) return undefined;
    words += `{${formatTime(start)}~${formatTime(Math.max(start, end))}}${text}`;
  }
  return words.trimEnd();
}
