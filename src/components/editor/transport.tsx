import { FastForward, Pause, Play, Rewind } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { isLine } from "@/lib/dmll/model";
import type { SyncMode } from "@/lib/dmll/sync";
import { formatTime } from "@/lib/dmll/time";
import type { Lyrics } from "@/lib/dmll/types";
import { PLAYBACK_RATES, type PlaybackRate } from "@/lib/playback";

import { Waveform } from "./waveform";
import type { WaveformState } from "./use-waveform";

interface TransportProps {
  hasAudio: boolean;
  playing: boolean;
  time: number;
  duration: number;
  waveform: WaveformState;
  lyrics: Lyrics;
  /** The start of the line being synced, if it has one. */
  activeStart?: number;
  mode: SyncMode;
  rate: PlaybackRate;
  onModeChange: (mode: SyncMode) => void;
  onRateChange: (rate: PlaybackRate) => void;
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onSeek: (time: number) => void;
  onHeightChange: (height: number) => void;
}

const MODES: Array<{ value: SyncMode; label: string }> = [
  { value: "word", label: "Word" },
  { value: "line", label: "Line" },
];

/** Seconds of track the waveform shows; `Infinity` is the whole track. */
const SPANS = [
  { value: 8, label: "8s", title: "Show 8 seconds around the playhead" },
  { value: 20, label: "20s", title: "Show 20 seconds around the playhead" },
  { value: Number.POSITIVE_INFINITY, label: "All", title: "Show the whole track" },
];

export function Transport({
  hasAudio,
  playing,
  time,
  duration,
  waveform,
  lyrics,
  activeStart,
  mode,
  rate,
  onModeChange,
  onRateChange,
  onTogglePlay,
  onSkip,
  onSeek,
  onHeightChange,
}: TransportProps) {
  const total = Number.isFinite(duration) ? duration : 0;
  const footerRef = useRef<HTMLElement>(null);
  const [span, setSpan] = useState<number>(SPANS[0].value);

  const lineStarts = useMemo(
    () => lyrics.flatMap((entry) => (isLine(entry) && entry.start !== undefined ? [entry.start] : [])),
    [lyrics],
  );

  // The page reserves the footer's real height, which changes with the waveform
  // and with wrapping on a narrow window.
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const observer = new ResizeObserver(() => onHeightChange(footer.offsetHeight));
    observer.observe(footer);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <footer
      ref={footerRef}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <Waveform
            waveform={waveform}
            duration={total}
            time={time}
            lines={lineStarts}
            activeStart={activeStart}
            span={span}
            onSeek={onSeek}
            className="min-w-0 flex-1"
          />

          <div role="group" aria-label="Waveform window" className="flex shrink-0 rounded-md border border-border p-0.5 text-xs">
            {SPANS.map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={span === option.value}
                title={option.title}
                onClick={() => setSpan(option.value)}
                className={cx(
                  "rounded-sm px-2 py-1 font-medium tabular-nums transition-colors",
                  span === option.value ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <div role="group" aria-label="Playback speed" className="flex rounded-md border border-border p-0.5 text-xs">
            {PLAYBACK_RATES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={rate === value}
                title={`Play at ${value}×. The playhead stays media time, so taps stay correct.`}
                onClick={() => onRateChange(value)}
                className={cx(
                  "rounded-sm px-2 py-1 font-medium tabular-nums transition-colors",
                  rate === value ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {value}×
              </button>
            ))}
          </div>

          <p className="w-full text-xs leading-relaxed text-text-tertiary">
            Space tap · Shift+Space end word · Enter end line · Backspace undo · P play · ←/→ seek · [ ] speed · S / E
            set the selected word&apos;s start / end · , . ; &apos; nudge it (hold Shift for bigger steps) · F2 edits a
            word
          </p>
        </div>
      </div>
    </footer>
  );
}
