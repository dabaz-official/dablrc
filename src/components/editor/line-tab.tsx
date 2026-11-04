"use client";

import { Play } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { isLine, currentLineIndex, lastLineIndex, parentOf } from "@/lib/dmll/model";
import { formatTime } from "@/lib/dmll/time";

import { LineRow } from "./line-row";
import { TimeChip } from "./time-chip";
import type { EditorController } from "./use-editor";

const STEP = 0.1;

interface LineTabProps {
  editor: EditorController;
  /** Switch to the text editor when there is nothing to show. */
  onEdit: () => void;
}

/** The line list: timestamps, playback, the End of lyrics row and the player. */
export function LineTab({ editor, onEdit }: LineTabProps) {
  const { lyrics, voices, dispatch, activate, playback } = editor;
  const { time, currentTime, seek, playing, togglePlay } = playback;

  const current = currentLineIndex(lyrics, time);
  const last = lastLineIndex(lyrics);
  const lastEntry = last >= 0 ? lyrics[last] : undefined;
  const lastTokenIndex = isLine(lastEntry) ? lastEntry.tokens.length - 1 : -1;
  const lastToken = isLine(lastEntry) && lastTokenIndex >= 0 ? lastEntry.tokens[lastTokenIndex] : undefined;
  const end = lastToken?.end;

  const hasLines = useMemo(() => lyrics.some((entry) => isLine(entry)), [lyrics]);

  const setStart = useCallback(
    (index: number) => dispatch({ type: "setLineStart", entry: index, time: currentTime() }),
    [currentTime, dispatch],
  );
  const clear = useCallback((index: number) => dispatch({ type: "clearTiming", entry: index }), [dispatch]);
  const nudge = useCallback(
    (index: number, delta: number) => dispatch({ type: "shiftLine", entry: index, delta }),
    [dispatch],
  );
  const select = useCallback((index: number, start: number | undefined) => activate(index, start), [activate]);
  const toggleVoice = useCallback((index: number) => dispatch({ type: "toggleVoice", entry: index }), [dispatch]);
  const toggleAdlib = useCallback((index: number) => dispatch({ type: "toggleAdlib", entry: index }), [dispatch]);
  const playLine = useCallback(
    (index: number, start: number | undefined) => {
      if (start === undefined) return;
      activate(index, start);
      if (!playing) togglePlay();
    },
    [activate, playing, togglePlay],
  );

  const setEnd = useCallback(() => {
    if (!lastToken || lastTokenIndex < 0) return;
    dispatch({ type: "setTokenEnd", ref: { entry: last, token: lastTokenIndex }, time: currentTime() });
  }, [currentTime, dispatch, last, lastToken, lastTokenIndex]);
  const clearEnd = useCallback(() => {
    if (lastTokenIndex < 0) return;
    dispatch({ type: "clearTokenEnd", ref: { entry: last, token: lastTokenIndex } });
  }, [dispatch, last, lastTokenIndex]);
  const nudgeEnd = useCallback(
    (delta: number) => {
      if (lastTokenIndex < 0) return;
      dispatch({ type: "nudgeTokenEnd", ref: { entry: last, token: lastTokenIndex }, delta });
    },
    [dispatch, last, lastTokenIndex],
  );
  const playEnd = useCallback(() => {
    if (end === undefined) return;
    seek(end);
    if (!playing) togglePlay();
  }, [end, playing, seek, togglePlay]);

  if (!hasLines) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-text-secondary">No lyrics yet.</p>
        <Button onClick={onEdit}>Go to Edit</Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-3 py-4 md:px-4">
        <ol className="flex flex-col gap-0.5">
          {lyrics.map((entry, index) => {
            if (entry.kind === "blank") return <li key={index} aria-hidden className="h-3" />;
            if (!isLine(entry)) return null;

            return (
              <LineRow
                key={index}
                index={index}
                entry={entry}
                current={current === index}
                voice={voices[index]}
                canAdlib={entry.kind === "adlib" || parentOf(lyrics, index) >= 0}
                onClear={clear}
                onSetStart={setStart}
                onSelect={select}
                onNudge={nudge}
                onPlay={playLine}
                onToggleVoice={toggleVoice}
                onToggleAdlib={toggleAdlib}
              />
            );
          })}

          <li className="flex flex-wrap items-center gap-2 rounded-md border-l-2 border-transparent px-2 py-1.5 sm:flex-nowrap">
            <TimeChip
              value={end}
              canTimestamp={lastToken?.start !== undefined}
              canAdjust={end !== undefined}
              timestampTitle={
                end === undefined
                  ? "Set the end to the playhead"
                  : `Seek to the end (${formatTime(end)})`
              }
              clearTitle="Clear the end of lyrics"
              minusTitle="Move the end back 0.1 seconds"
              plusTitle="Move the end forward 0.1 seconds"
              onTimestamp={() => {
                if (end !== undefined) seek(end);
                else setEnd();
              }}
              onClear={clearEnd}
              onMinus={() => nudgeEnd(-STEP)}
              onPlus={() => nudgeEnd(STEP)}
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-11 sm:size-9"
              title={end === undefined ? "No end of lyrics yet" : "Play from the end"}
              aria-label={end === undefined ? "Play from the end (unavailable)" : "Play from the end"}
              disabled={end === undefined}
              onClick={playEnd}
            >
              <Play className="size-4" />
            </Button>
            <p className="flex min-h-11 flex-1 basis-full items-center text-sm italic text-text-secondary sm:basis-auto sm:min-h-0">
              End of lyrics
            </p>
          </li>
        </ol>
      </div>
    </div>
  );
}
