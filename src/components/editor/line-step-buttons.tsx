"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { currentLineIndex, isLine, nextLine, previousLine } from "@/lib/dmll/model";

import type { EditorController } from "./use-editor";

interface LineStepButtonsProps {
  editor: EditorController;
}

/**
 * The two line-level controls above the player. Down stamps the next line at
 * the playhead and moves on to it; up clears the current line and returns to
 * the previous one. "Current" is the row highlighted by the playhead, so the
 * buttons follow what the Line tab is showing.
 */
export function LineStepButtons({ editor }: LineStepButtonsProps) {
  const { lyrics, playback, dispatch, activate } = editor;
  const { time, currentTime } = playback;

  const current = currentLineIndex(lyrics, time);
  const next = nextLine(lyrics, current);
  const previous = current >= 0 ? previousLine(lyrics, current) : -1;

  const stampNext = () => {
    if (next < 0) return;
    dispatch({ type: "setLineStart", entry: next, time: currentTime() });
    activate(next, undefined);
  };

  const clearAndBack = () => {
    if (current < 0) return;
    dispatch({ type: "clearTiming", entry: current });
    if (previous >= 0) {
      const entry = lyrics[previous];
      activate(previous, isLine(entry) ? entry.start : undefined);
    }
  };

  return (
    <div className="shrink-0 px-3 pb-2 md:px-4">
      <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-2 sm:gap-3">
        <Button
          size="md"
          variant="default"
          className="h-14 w-full rounded-lg px-0"
          title={
            previous >= 0
              ? "Clear this line and go to the previous line"
              : "Clear the current line's timestamp"
          }
          aria-label="Clear the current line and go to the previous line"
          disabled={current < 0}
          onClick={clearAndBack}
        >
          <ChevronUp className="size-7" />
        </Button>
        <Button
          size="md"
          variant="primary"
          className="h-14 w-full rounded-lg px-0"
          title="Set the next line to the playhead and move to it"
          aria-label="Set the next line to the playhead and move to it"
          disabled={next < 0}
          onClick={stampNext}
        >
          <ChevronDown className="size-7" />
        </Button>
      </div>
    </div>
  );
}
