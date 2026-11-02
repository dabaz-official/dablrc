import { isLine, type LineEntry } from "./model";
import type { Lyrics } from "./types";

/** The line at `index`. Throws when that row is blank, which a test should not expect. */
export function lineAt(lyrics: Lyrics, index: number): LineEntry {
  const entry = lyrics[index];
  if (!isLine(entry)) throw new Error(`row ${index} is blank`);
  return entry;
}
