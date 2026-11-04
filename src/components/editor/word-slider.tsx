"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { cx } from "@/lib/cx";

const PADDING = 8;
const TRACK_HEIGHT = 80;
const PILL_HEIGHT = 44;
const MIN_PILL = 48;
const MAX_PILL = 96;

interface WordSliderProps {
  wordCount: number;
  /** 0–1, controlled. */
  progress: number;
  /** The word under the pill, for the dots. */
  activeWord: number;
  disabled?: boolean;
  onStart: () => void;
  onProgress: (progress: number) => void;
  onRelease: (progress: number) => void;
  onCancel: () => void;
  /** Keyboard: start the next word. */
  onStep: () => void;
  /** Keyboard: finalize the current word. */
  onCommit: () => void;
}

interface Geometry {
  trackLeft: number;
  travel: number;
  grab: number;
}

/**
 * The Word progress rail: a tall track, one dot per word, and a long pill the
 * user drags forward. The pill only moves right; the pointer is captured for
 * the whole gesture. Its keyboard fallback is ArrowRight / Enter.
 */
export function WordSlider({
  wordCount,
  progress,
  activeWord,
  disabled = false,
  onStart,
  onProgress,
  onRelease,
  onCancel,
  onStep,
  onCommit,
}: WordSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const geometry = useRef<Geometry>({ trackLeft: 0, travel: 1, grab: 0 });
  const maxProgress = useRef(progress);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Read once up front: some embedded browsers defer ResizeObserver callbacks.
    const measure = () => setWidth(track.getBoundingClientRect().width);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const dots = wordCount > 0 ? wordCount : 12;
  const inner = Math.max(0, width - PADDING * 2);
  const slot = inner / Math.max(1, dots);
  const pillWidth = wordCount > 0 ? Math.min(MAX_PILL, Math.max(MIN_PILL, slot)) : MIN_PILL;
  const travel = Math.max(1, inner - pillWidth);
  const pillLeft = PADDING + Math.min(1, Math.max(0, progress)) * travel;

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const track = trackRef.current?.getBoundingClientRect();
    const pill = pillRef.current?.getBoundingClientRect();
    if (!track || !pill) return;

    dragging.current = true;
    maxProgress.current = progress;
    geometry.current = {
      trackLeft: track.left,
      travel,
      grab: event.clientX - pill.left,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onStart();
  }

  function progressAt(clientX: number): number {
    const geom = geometry.current;
    const left = clientX - geom.trackLeft - PADDING - geom.grab;
    return Math.min(1, Math.max(0, left / geom.travel));
  }

  function move(clientX: number) {
    if (!dragging.current) return;
    const next = Math.max(maxProgress.current, progressAt(clientX));
    if (next <= maxProgress.current) return;
    maxProgress.current = next;
    onProgress(next);
  }

  function end(clientX: number) {
    if (!dragging.current) return;
    const next = Math.max(maxProgress.current, progressAt(clientX));
    if (next > maxProgress.current) {
      maxProgress.current = next;
      onProgress(next);
    }
    dragging.current = false;
    onRelease(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      onStep();
    } else if (event.key === "ArrowLeft") {
      // The gesture is forward-only.
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      onCommit();
    }
  }

  return (
    <div
      ref={trackRef}
      className={cx("relative w-full select-none rounded-2xl border border-border bg-surface-secondary", disabled && "opacity-60")}
      style={{ height: TRACK_HEIGHT }}
    >
      {/* Word slots, always visible under the pill. */}
      {Array.from({ length: dots }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cx(
            "absolute bottom-3 size-1.5 -translate-x-1/2 rounded-full",
            index <= activeWord && !disabled ? "bg-timed" : "bg-border-strong",
          )}
          style={{ left: PADDING + ((index + 0.5) * inner) / dots }}
        />
      ))}

      <div
        ref={pillRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Word sync progress"
        aria-valuemin={0}
        aria-valuemax={Math.max(1, wordCount)}
        aria-valuenow={wordCount > 0 ? activeWord + 1 : 0}
        aria-valuetext={wordCount > 0 ? `Word ${activeWord + 1} of ${wordCount}` : "No words"}
        aria-disabled={disabled}
        className={cx(
          "absolute top-1/2 -translate-y-1/2 touch-none rounded-full bg-timed outline-none",
          disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        )}
        style={{ left: pillLeft, width: pillWidth, height: PILL_HEIGHT }}
        onPointerDown={begin}
        onPointerMove={(event) => move(event.clientX)}
        onPointerUp={(event) => end(event.clientX)}
        onPointerCancel={() => {
          dragging.current = false;
          onCancel();
        }}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
