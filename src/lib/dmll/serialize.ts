import { isLine, parentOf, plainText } from "./model";
import { formatTime } from "./time";
import type { Lyrics, Token, Voice } from "./types";

/**
 * Writes lyrics as a DMLL file. A line is word-timed only when every word has
 * both times; a partly timed line keeps just its line timestamp, and an untimed
 * line is plain text. An ad-lib under an untimed line is plain text too, since
 * DMLL would otherwise attach it to an earlier line.
 */
export function serializeLyrics(lyrics: Lyrics): string {
  const out = ["[dmll:1]", ""];
  let voice: Voice = "left";

  lyrics.forEach((entry, index) => {
    if (entry.kind === "blank") {
      if (out[out.length - 1] !== "") out.push("");
      return;
    }

    const text = plainText(entry.tokens);
    if (!text) return;
    if (entry.start === undefined) {
      out.push(text);
      return;
    }

    if (entry.kind === "adlib") {
      const parent = lyrics[parentOf(lyrics, index)];
      const attaches = isLine(parent) && parent.start !== undefined;
      out.push(attaches ? timedLine("ad:", entry.start, entry.tokens) : text);
      return;
    }

    if (entry.voice !== voice) {
      if (out[out.length - 1] !== "") out.push("");
      out.push(`[v:${entry.voice}]`);
      voice = entry.voice;
    }
    out.push(timedLine("", entry.start, entry.tokens));
  });

  while (out[out.length - 1] === "") out.pop();
  return `${out.join("\n")}\n`;
}

/** `[ts] {s~e}word …`, or `[ts] text` when the words are not all timed. */
function timedLine(tag: "" | "ad:", start: number, tokens: Token[]): string {
  return `[${tag}${formatTime(start)}] ${wordsOf(tokens) ?? plainText(tokens)}`;
}

/**
 * Writes the lyrics as LRC-shaped text for the edit box: one `[mm:ss.xx] text`
 * line each, voice directives and ad-libs kept, no word tokens.
 *
 * A timestamp stays on its line while the words are edited, so applying the
 * text keeps every line's time.
 */
export function toLrcText(lyrics: Lyrics): string {
  const out: string[] = [];
  let voice: Voice = "left";

  lyrics.forEach((entry, index) => {
    if (entry.kind === "blank") {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      return;
    }

    const text = plainText(entry.tokens);
    if (!text) return;

    if (entry.kind === "adlib") {
      const parent = lyrics[parentOf(lyrics, index)];
      const attaches = isLine(parent) && parent.start !== undefined;
      out.push(attaches && entry.start !== undefined ? `[ad:${formatTime(entry.start)}] ${text}` : text);
      return;
    }

    if (entry.voice !== voice) {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      out.push(`[v:${entry.voice}]`);
      voice = entry.voice;
    }
    out.push(entry.start === undefined ? text : `[${formatTime(entry.start)}] ${text}`);
  });

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
