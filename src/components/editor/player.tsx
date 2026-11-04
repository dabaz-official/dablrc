"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useCallback, useRef, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { formatClock } from "@/lib/dmll/time";

import type { EditorController } from "./use-editor";

const SKIP_SECONDS = 3;

interface SeekBarProps {
  time: number;
  duration: number;
  onSeek: (time: number) => void;
}

/** A plain, draggable playback bar. It has no waveform. */
function SeekBar({ time, duration, onSeek }: SeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const total = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const ratio = total > 0 ? Math.min(1, Math.max(0, time / total)) : 0;

  const seekFrom = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || total <= 0) return;
      const rect = track.getBoundingClientRect();
      const next = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(next * total);
    },
    [onSeek, total],
  );

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (total <= 0) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFrom(event.clientX);
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Playback position"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={formatClock(time)}
      className="group relative flex h-11 min-w-0 flex-1 cursor-pointer touch-none items-center"
      onPointerDown={onPointerDown}
      onPointerMove={(event) => {
        if (dragging.current) seekFrom(event.clientX);
      }}
      onPointerUp={(event) => {
        if (!dragging.current) return;
        dragging.current = false;
        seekFrom(event.clientX);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={(event) => {
        let next: number;
        if (event.key === "ArrowLeft") next = time - 1;
        else if (event.key === "ArrowRight") next = time + 1;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = total;
        else return;
        event.preventDefault();
        event.stopPropagation();
        onSeek(Math.min(total, Math.max(0, next)));
      }}
    >
      <div className="relative h-1.5 w-full rounded-full bg-border">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${ratio * 100}%` }} />
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
          style={{ left: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

interface PlayerProps {
  playback: EditorController["playback"];
  className?: string;
}

/**
 * The standard player under Edit and Line: play/pause, a seek bar, and the two
 * three-second jumps. The Word tab has its own controls.
 */
export function Player({ playback, className }: PlayerProps) {
  const { hasAudio, playing, time, duration, togglePlay, seek } = playback;

  return (
    <footer className={cx("shrink-0 border-t border-border bg-surface/95 backdrop-blur", className)}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Button
          size="icon"
          variant="primary"
          className="size-11"
          title="Play or pause (Space)"
          aria-label={playing ? "Pause" : "Play"}
          disabled={!hasAudio}
          onClick={togglePlay}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>

        <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-text-secondary sm:w-10">
          {formatClock(time)}
        </span>

        <SeekBar time={time} duration={duration} onSeek={seek} />

        <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-text-tertiary sm:w-10">
          {formatClock(duration)}
        </span>

        <Button
          size="icon"
          variant="ghost"
          className="size-11"
          title="Back 3 seconds"
          aria-label="Back 3 seconds"
          disabled={!hasAudio}
          onClick={() => seek(Math.max(0, time - SKIP_SECONDS))}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-11"
          title="Forward 3 seconds"
          aria-label="Forward 3 seconds"
          disabled={!hasAudio}
          onClick={() => seek(time + SKIP_SECONDS)}
        >
          <RotateCw className="size-4" />
        </Button>
      </div>
    </footer>
  );
}
