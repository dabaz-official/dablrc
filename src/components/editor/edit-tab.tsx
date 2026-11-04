"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { mergeLyrics, toPlainText } from "@/lib/dmll/merge";
import { parseLyrics } from "@/lib/dmll/parse";

import type { EditorController } from "./use-editor";

/** Removes leading and trailing spaces from every line, as the Edit tab promises. */
function normalizeText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join("\n");
}

interface EditTabProps {
  editor: EditorController;
}

/**
 * The plain-text lyric editor. Applying merges, so an unchanged line keeps its
 * timing, voice, ad-lib role and group; comments, tags and blank rows survive
 * because they are ordinary lines in the text.
 */
export function EditTab({ editor }: EditTabProps) {
  const { lyrics, dispatch } = editor;

  const [draft, setDraft] = useState(() => toPlainText(lyrics));
  const [source, setSource] = useState(lyrics);
  const [focused, setFocused] = useState(false);
  /** The text the lyrics currently hold, so a timer cannot add a no-op step. */
  const lastApplied = useRef(toPlainText(lyrics));

  // Adopt lyrics that changed outside this textarea (import, undo, another tab).
  if (source !== lyrics) {
    setSource(lyrics);
    if (!focused) setDraft(toPlainText(lyrics));
  }

  useEffect(() => {
    lastApplied.current = toPlainText(lyrics);
  }, [lyrics]);

  const apply = useCallback(
    (text: string) => {
      const normalized = normalizeText(text);
      if (normalized === lastApplied.current) return;
      lastApplied.current = normalized;
      dispatch({ type: "replace", lyrics: mergeLyrics(lyrics, parseLyrics(normalized)) });
    },
    [dispatch, lyrics],
  );

  // Keep the draft saved even when the user never blurs the textarea.
  useEffect(() => {
    if (!focused) return;
    const timer = setTimeout(() => apply(draft), 500);
    return () => clearTimeout(timer);
  }, [apply, draft, focused]);

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 py-4">
      <label htmlFor="lyrics-edit" className="sr-only">
        Lyrics
      </label>
      <textarea
        id="lyrics-edit"
        value={draft}
        spellCheck={false}
        placeholder="Paste your lyrics here, one line per row. Comments and [ar:] tags are kept. Blank rows become section breaks."
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const normalized = normalizeText(draft);
          setDraft(normalized);
          apply(normalized);
        }}
        className="h-full w-full resize-none rounded-lg border border-border bg-surface p-4 font-sans text-base leading-8 text-text-primary placeholder:text-text-tertiary focus:outline-none sm:text-lg sm:leading-9"
      />
    </div>
  );
}
