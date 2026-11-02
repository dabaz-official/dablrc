"use client";

import { useEffect, useMemo } from "react";

import type { TokenRef } from "@/lib/dmll/sync";
import type { Lyrics, Voice } from "@/lib/dmll/types";

import { LyricRow } from "./lyric-row";

interface LyricListProps {
  lyrics: Lyrics;
  voices: Voice[];
  active: number;
  cursor: number;
  selected?: TokenRef;
  time: number;
  onActivate: (entry: number, start: number | undefined) => void;
  onSelectToken: (ref: TokenRef, start: number | undefined) => void;
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
  time,
  onActivate,
  onSelectToken,
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
      {lyrics.map((entry, index) =>
        entry.kind === "blank" ? (
          <li key={index} aria-hidden className="h-5" />
        ) : (
          <LyricRow
            key={index}
            index={index}
            entry={entry}
            number={numbers[index]}
            voice={voices[index]}
            isActive={index === active}
            cursor={index === active ? cursor : -1}
            selected={selected?.entry === index ? selected.token : -1}
            time={time}
            onActivate={onActivate}
            onSelectToken={onSelectToken}
            onSeek={onSeek}
            onToggleVoice={onToggleVoice}
            onToggleAdlib={onToggleAdlib}
            onClearTiming={onClearTiming}
          />
        ),
      )}
    </ol>
  );
}
