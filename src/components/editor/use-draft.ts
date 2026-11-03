"use client";

import { useEffect } from "react";

import { EMPTY_HISTORY } from "@/lib/dmll/sync";
import type { Lyrics } from "@/lib/dmll/types";

/** The old project name is kept here on purpose: changing the key drops every saved draft. */
const STORAGE_KEY = "dablrc.draft";
const KINDS = new Set(["lyric", "adlib", "blank"]);

function isLyrics(value: unknown): value is Lyrics {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "object" && entry !== null && "kind" in entry && KINDS.has(String(entry.kind)))
  );
}

/** The saved lyrics, or undefined when there are none or they cannot be read. */
function readDraft(): Lyrics | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const { lyrics } = JSON.parse(raw) as { lyrics?: unknown };
    return isLyrics(lyrics) ? lyrics : undefined;
  } catch {
    return undefined;
  }
}

function writeDraft(lyrics: Lyrics): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lyrics }));
  } catch {
    // Storage may be full or disabled; the editor works without it.
  }
}

/**
 * Keeps the lyrics and their timing in local storage, so a reload loses nothing.
 * The audio is not stored; it has to be opened again.
 */
export function useDraft(lyrics: Lyrics, restore: (lyrics: Lyrics) => void) {
  useEffect(() => {
    const draft = readDraft();
    if (draft) restore(draft);
  }, [restore]);

  useEffect(() => {
    // The initial empty state is not a change, so it never overwrites a saved draft.
    if (lyrics === EMPTY_HISTORY.present.lyrics) return;
    writeDraft(lyrics);
  }, [lyrics]);
}
