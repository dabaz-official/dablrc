/** The side a lyric line sits on, set by a `[v:left]` or `[v:right]` directive. */
export type Voice = "left" | "right";

/**
 * A word, or a CJK character, that DMLL times. `text` keeps the space that
 * follows it, so the tokens of a line joined together give back its text.
 */
export interface Token {
  text: string;
  /** Seconds from the start of the track. Absent until the word is timed. */
  start?: number;
  /** Seconds from the start of the track. Never before `start`. */
  end?: number;
}

interface LineBase {
  /** Line timestamp in seconds. Absent for untimed text. */
  start?: number;
  tokens: Token[];
}

/** A lyric line. Without a timestamp it is static text. */
export interface LyricEntry extends LineBase {
  kind: "lyric";
  voice: Voice;
  /**
   * Entries that came from one multi-timestamp line share this id, so they can
   * be written back as `[t1][t2] text`. It is only honoured while the copies
   * still match.
   */
  group?: number;
}

/** An ad-lib, written under the timed lyric line above it. */
export interface AdlibEntry extends LineBase {
  kind: "adlib";
}

/** A blank source line, kept so section breaks survive an edit. */
export interface BlankEntry {
  kind: "blank";
}

/** A `//` comment, kept so notes in a file survive a round trip. */
export interface CommentEntry {
  kind: "comment";
  text: string;
}

/** A metadata tag such as `[ar:...]` or `[offset:...]`, kept verbatim. */
export interface MetaEntry {
  kind: "meta";
  text: string;
}

export type Entry = LyricEntry | AdlibEntry | BlankEntry | CommentEntry | MetaEntry;

/** A lyric file as the editor holds it: its lines in file order. */
export type Lyrics = Entry[];
