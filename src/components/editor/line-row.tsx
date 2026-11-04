"use client";

import { Play } from "lucide-react";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { plainText, type LineEntry } from "@/lib/dmll/model";
import { formatTime } from "@/lib/dmll/time";

import { TimeChip } from "./time-chip";

export interface LineRowProps {
  index: number;
  entry: LineEntry;
  /** Whether the playhead is inside this line. */
  current: boolean;
  onClear: (index: number) => void;
  onSetStart: (index: number) => void;
  onSelect: (index: number, start: number | undefined) => void;
  onNudge: (index: number, delta: number) => void;
  onPlay: (index: number, start: number | undefined) => void;
}

const STEP = 0.1;

/** One lyric line in the Line tab: time chip, play button and the words. */
export const LineRow = memo(function LineRow({
  index,
  entry,
  current,
  onClear,
  onSetStart,
  onSelect,
  onNudge,
  onPlay,
}: LineRowProps) {
  const start = entry.start;
  const isAdlib = entry.kind === "adlib";

  return (
    <li
      className={cx(
        "flex flex-wrap items-center gap-2 rounded-md border-l-2 px-2 py-1.5 transition-colors sm:flex-nowrap",
        current ? "border-timed bg-timed-subtle" : "border-transparent hover:bg-surface-secondary/60",
      )}
    >
      <TimeChip
        value={start}
        canTimestamp
        canAdjust={start !== undefined}
        highlighted={current}
        timestampTitle={start === undefined ? "Set the line start to the playhead" : `Seek to ${formatTime(start)}`}
        clearTitle="Clear this line's timestamp"
        minusTitle="Move the whole line back 0.1 seconds"
        plusTitle="Move the whole line forward 0.1 seconds"
        onTimestamp={() => (start === undefined ? onSetStart(index) : onSelect(index, start))}
        onClear={() => onClear(index)}
        onMinus={() => onNudge(index, -STEP)}
        onPlus={() => onNudge(index, STEP)}
      />

      <Button
        size="icon"
        variant="ghost"
        className="size-11 sm:size-9"
        title={start === undefined ? "Give this line a timestamp first" : `Play from ${formatTime(start)}`}
        aria-label={start === undefined ? "Play line (no timestamp)" : `Play from ${formatTime(start)}`}
        disabled={start === undefined}
        onClick={() => onPlay(index, start)}
      >
        <Play className="size-4" />
      </Button>

      <button
        type="button"
        onClick={() => onSelect(index, start)}
        className={cx(
          "flex min-h-11 min-w-0 flex-1 basis-full items-center gap-2 text-left sm:basis-auto sm:min-h-0",
          isAdlib ? "text-sm text-text-secondary" : "text-base text-text-primary",
        )}
      >
        {isAdlib && (
          <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
            Ad-lib
          </span>
        )}
        <span className="min-w-0">{plainText(entry.tokens)}</span>
      </button>
    </li>
  );
});
