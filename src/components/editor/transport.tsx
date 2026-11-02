import { FastForward, Pause, Play, Rewind } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import type { SyncMode } from "@/lib/dmll/sync";
import { formatTime } from "@/lib/dmll/time";

interface TransportProps {
  hasAudio: boolean;
  playing: boolean;
  time: number;
  duration: number;
  mode: SyncMode;
  onModeChange: (mode: SyncMode) => void;
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onSeek: (time: number) => void;
}

const MODES: Array<{ value: SyncMode; label: string }> = [
  { value: "word", label: "Word" },
  { value: "line", label: "Line" },
];

export function Transport({
  hasAudio,
  playing,
  time,
  duration,
  mode,
  onModeChange,
  onTogglePlay,
  onSkip,
  onSeek,
}: TransportProps) {
  const total = Number.isFinite(duration) ? duration : 0;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Back 2 seconds (Left arrow)"
            aria-label="Back 2 seconds"
            disabled={!hasAudio}
            onClick={() => onSkip(-2)}
          >
            <Rewind className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="primary"
            title="Play or pause (P)"
            aria-label={playing ? "Pause" : "Play"}
            disabled={!hasAudio}
            onClick={onTogglePlay}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Forward 2 seconds (Right arrow)"
            aria-label="Forward 2 seconds"
            disabled={!hasAudio}
            onClick={() => onSkip(2)}
          >
            <FastForward className="size-4" />
          </Button>
        </div>

        <span className="shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-text-secondary">
          {formatTime(time)} / {formatTime(total)}
        </span>

        <input
          type="range"
          min={0}
          max={total}
          step={0.01}
          value={Math.min(time, total)}
          disabled={!hasAudio || total === 0}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Seek"
          className="min-w-40 flex-1 accent-primary"
        />

        <div role="group" aria-label="Sync mode" className="flex rounded-md border border-border p-0.5 text-xs">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => onModeChange(option.value)}
              className={cx(
                "rounded-sm px-2 py-1 font-medium transition-colors",
                mode === option.value ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="w-full text-xs leading-relaxed text-text-tertiary">
          Space tap · Shift+Space end word · Enter end line · Backspace undo · P play · ←/→ seek · S / E set the
          selected word&apos;s start / end · , . ; &apos; nudge it (hold Shift for bigger steps)
        </p>
      </div>
    </footer>
  );
}
