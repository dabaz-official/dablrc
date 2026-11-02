import { tokenize } from "./tokenize";
import type { Entry, Lyrics, LyricEntry, Token, Voice } from "./types";

const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const WORD_TAG =
  /\{(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?~(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\}/g;
const HAS_TIME_TAG = /\[\d{1,3}:\d{1,2}/;
const METADATA_TAG = /^\[(ar|ti|al|by|offset|re|ve|length|dmll):/i;
const VOICE_DIRECTIVE = /^\[v:(left|right)\]$/i;
const ADLIB_LINE = /^\[ad:(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]\s*(.*)$/i;
const TIMED_SOURCE = /^\s*\[(\d{1,3}:\d{1,2}|ad:|v:|dmll:)/im;
const COMMENT = /^\/\//;
const DUET_MARKER = ">>";
const DUET_SEPARATOR = " | ";

/** `[02:03.4]` and `[02:03.400]` both mean 2 min 3.4 s. */
function toSeconds(minutes: string, seconds: string, fraction?: string): number {
  return Number(minutes) * 60 + Number(seconds) + (fraction ? Number(`0.${fraction}`) : 0);
}

/** Every `[mm:ss.xx]` on a line, in source order. */
function timesIn(text: string): number[] {
  return [...text.matchAll(TIME_TAG)].map((match) => toSeconds(match[1], match[2], match[3]));
}

/** The text with its `[mm:ss.xx]` tags removed. */
function untimedText(text: string): string {
  return text.replace(TIME_TAG, "").trim();
}

/**
 * Reads a line body into tokens. A DMLL body is cut at its `{start~end}` tags,
 * each tag starting the text after it. Text before the first tag runs from
 * `lineStart` to that tag, as on the site. A body without tags is plain text,
 * split into untimed words.
 */
function readTokens(body: string, lineStart: number): Token[] {
  const tags = [...body.matchAll(WORD_TAG)];
  if (tags.length === 0) return tokenize(body);

  const tokens: Token[] = [];
  const first = tags[0];
  const prefix = body.slice(0, first.index).replace(/^\s+/, "");
  if (prefix.trim()) {
    const firstStart = toSeconds(first[1], first[2], first[3]);
    tokens.push({ text: prefix, start: lineStart, end: Math.max(lineStart, firstStart) });
  }

  tags.forEach((tag, index) => {
    const next = tags[index + 1];
    const text = body.slice(tag.index + tag[0].length, next ? next.index : body.length);
    if (!text.trim()) return;
    const start = toSeconds(tag[1], tag[2], tag[3]);
    const end = toSeconds(tag[4], tag[5], tag[6]);
    tokens.push({ text, start, end: Math.max(start, end) });
  });
  return tokens;
}

/** Moves every word by `offset` seconds, so a repeated timestamp reuses the words. */
function shifted(tokens: Token[], offset: number): Token[] {
  if (offset === 0) return tokens;
  return tokens.map(({ text, start, end }) => ({
    text,
    start: start === undefined ? undefined : start + offset,
    end: end === undefined ? undefined : end + offset,
  }));
}

/** A timed line, once for each of its timestamps. */
function timedEntries(line: string, voice: Voice): LyricEntry[] {
  const times = timesIn(line);
  const body = untimedText(line);
  if (times.length === 0 || !body) return [];

  const tokens = readTokens(body, times[0]);
  return times.map(
    (start): LyricEntry => ({ kind: "lyric", voice, start, tokens: shifted(tokens, start - times[0]) }),
  );
}

/** The legacy `>> [t] lead | [t] echo` form: the echo becomes an ad-lib under the lead. */
function duetEntries(line: string, voice: Voice): Entry[] | undefined {
  const [lead = "", echo = ""] = line.slice(DUET_MARKER.length).split(DUET_SEPARATOR);
  const leadTimes = timesIn(lead);
  const echoTimes = timesIn(echo);
  const leadText = untimedText(lead);
  const echoText = untimedText(echo);
  if (!leadTimes.length || !echoTimes.length || !leadText || !echoText) return undefined;

  return [
    { kind: "lyric", voice, start: leadTimes[0], tokens: tokenize(leadText) },
    { kind: "adlib", start: echoTimes[0], tokens: tokenize(echoText) },
  ];
}

/**
 * Reads LRC or DMLL source, or plain lyrics with one line per row. Lines are
 * kept in file order; a line with a timestamp but no text is dropped, as on the
 * site.
 */
export function parseLyrics(source: string): Lyrics {
  const lyrics: Lyrics = [];
  let voice: Voice = "left";

  // A byte-order mark from a text editor must not end up in the first line.
  for (const raw of source.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (lyrics.length > 0 && lyrics[lyrics.length - 1].kind !== "blank") {
        lyrics.push({ kind: "blank" });
      }
      continue;
    }
    if (COMMENT.test(line) || METADATA_TAG.test(line)) continue;

    const directive = VOICE_DIRECTIVE.exec(line);
    if (directive) {
      voice = directive[1].toLowerCase() === "right" ? "right" : "left";
      continue;
    }

    const adlib = ADLIB_LINE.exec(line);
    if (adlib) {
      const start = toSeconds(adlib[1], adlib[2], adlib[3]);
      const body = adlib[4].trim();
      if (body) lyrics.push({ kind: "adlib", start, tokens: readTokens(body, start) });
      continue;
    }

    const duet = line.startsWith(DUET_MARKER) ? duetEntries(line, voice) : undefined;
    if (duet) {
      lyrics.push(...duet);
      continue;
    }

    if (HAS_TIME_TAG.test(line)) {
      lyrics.push(...timedEntries(line, voice));
    } else {
      lyrics.push({ kind: "lyric", voice, tokens: tokenize(line) });
    }
  }

  while (lyrics.length > 0 && lyrics[lyrics.length - 1].kind === "blank") lyrics.pop();
  return lyrics;
}

/** Whether pasted or opened text already carries timestamps or DMLL directives. */
export function isTimedSource(text: string): boolean {
  return TIMED_SOURCE.test(text);
}
