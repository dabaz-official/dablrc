"use client";

import { useEffect, useMemo } from "react";

import type { SyncMode, TokenRef } from "@/lib/dmll/sync";
import { hasOpenWord, isLine } from "@/lib/dmll/model";
import type { Lyrics, Voice } from "@/lib/dmll/types";

import { LyricRow } from "./lyric-row";

interface LyricListProps {
  lyrics: Lyrics;
  voices: Voice[];
  active: number;
  cursor: number;
  selected?: TokenRef;
  mode: SyncMode;
  time: number;
  /** The word being edited in place, whichever row it belongs to. */
  editing?: TokenRef;
  onActivate: (entry: number, start: number | undefined) => void;
  onSelectToken: (ref: TokenRef, start: number | undefined) => void;
  onEditToken: (ref: TokenRef) => void;
  onCommitToken: (ref: TokenRef, text: string) => void;
  onCancelEdit: () => void;
  onSeek: (time: number) => void;
  onToggleVoice: (entry: number) => void;
  onToggleAdlib: (entry: number) => void;
  onClearTiming: (entry: number) => void;
}

/** The number of each lyric line, counting only lyric lines (not ad-libs or blanks). */
function lineNumbers(lyrics: Lyrics): Array<number | undefined> {
  let count = 0;
  return lyrics.map((entry) => {
    if (entry.kind !== "lyric") return undefined;
    count += 1;
    return count;
  });
}

export function LyricList({
  lyrics,
  voices,
  active,
  cursor,
  selected,
  mode,
  time,
  editing,
  onActivate,
  onSelectToken,
  onEditToken,
  onCommitToken,
  onCancelEdit,
  onSeek,
  onToggleVoice,
  onToggleAdlib,
  onClearTiming,
}: LyricListProps) {
  const numbers = useMemo(() => lineNumbers(lyrics), [lyrics]);

  // Keep the line being synced in view as taps move on to the next one.
  useEffect(() => {
    if (active < 0) return;
    document.getElementById(`line-${active}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active]);

  return (
    <ol className="mx-auto flex max-w-5xl flex-col gap-0.5 px-4 pb-8">
      {lyrics.map((entry, index) => {
        if (entry.kind === "blank") return <li key={index} aria-hidden className="h-5" />;

        // Comments are part of the file, so they are shown; tags are not.
        if (entry.kind === "comment") {
          return (
            <li key={index} className="select-none px-2 py-0.5 text-xs italic text-text-tertiary">
              {entry.text}
            </li>
          );
        }
        if (!isLine(entry)) return null;

        // `time` changes on every frame while playing; a row that is not singing
        // keeps the old value so its memoised render can bail out.
        const singing = entry.tokens.some(
          (token) => token.start !== undefined && token.end !== undefined && time >= token.start && time < token.end,
        );

        return (
          <LyricRow
            key={index}
            index={index}
            entry={entry}
            number={numbers[index]}
            voice={voices[index]}
            isActive={index === active}
            cursor={index === active ? cursor : -1}
            selected={selected?.entry === index ? selected.token : -1}
            endHint={index === active && !hasOpenWord(entry)}
            mode={mode}
            time={index === active || singing ? time : -1}
            editing={editing?.entry === index ? editing.token : -1}
            onActivate={onActivate}
            onSelectToken={onSelectToken}
            onEditToken={onEditToken}
            onCommitToken={onCommitToken}
            onCancelEdit={onCancelEdit}
            onSeek={onSeek}
            onToggleVoice={onToggleVoice}
            onToggleAdlib={onToggleAdlib}
            onClearTiming={onClearTiming}
          />
        );
      })}
    </ol>
  );
}
