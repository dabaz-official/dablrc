"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { cx } from "@/lib/cx";

const PADDING = 8;
const TRACK_HEIGHT = 80;
const PILL_HEIGHT = 44;
const MIN_PILL = 56;
const MAX_PILL = 96;

interface WordSliderProps {
  wordCount: number;
  /** Start fractions of the words, plus 1 for the line's end. */
  boundaries: number[];
  /** 0–1, the cursor's position across the whole line. */
  progress: number;
  /** The word the cursor is in, for the accessible value. */
  activeWord: number;
  disabled?: boolean;
  onStart: () => void;
  onProgress: (progress: number) => void;
  onRelease: (progress: number) => void;
  onCancel: () => void;
  /** Keyboard: move to the next boundary. */
  onStep: () => void;
  /** Keyboard: finalize the current word. */
  onCommit: () => void;
}

interface Geometry {
  trackLeft: number;
  inner: number;
}

/**
 * The Word rail: the whole track is the line, one dot marks each word's start,
 * and a long pill is the cursor. The user drags from the left edge to the right
 * edge; the pill only moves forward and the pointer is captured for the gesture.
 * Its keyboard fallback is ArrowRight / Enter.
 */
export function WordSlider({
  wordCount,
  boundaries,
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
  const dragging = useRef(false);
  const geometry = useRef<Geometry>({ trackLeft: 0, inner: 1 });
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

  const inner = Math.max(0, width - PADDING * 2);
  const starts = wordCount > 0 ? boundaries.slice(0, wordCount) : [];
  const marks = starts.length > 0 ? starts : Array.from({ length: 12 }, (_, index) => (index + 0.5) / 12);
  // A long handle whose centre is the cursor, kept inside the track at the edges.
  const pillWidth = Math.min(MAX_PILL, Math.max(MIN_PILL, inner * 0.12));
  const travel = Math.max(1, inner - pillWidth);
  const pillLeft = PADDING + Math.min(travel, Math.max(0, progress * inner - pillWidth / 2));

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const track = trackRef.current?.getBoundingClientRect();
    if (!track) return;

    dragging.current = true;
    maxProgress.current = progress;
    geometry.current = { trackLeft: track.left, inner };
    event.currentTarget.setPointerCapture(event.pointerId);
    onStart();
  }

  function progressAt(clientX: number): number {
    const geom = geometry.current;
    return Math.min(1, Math.max(0, (clientX - geom.trackLeft - PADDING) / Math.max(1, geom.inner)));
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
      {/* One mark per word start; the line's end is the right edge. */}
      {marks.map((mark, index) => (
        <span
          key={index}
          aria-hidden
          className={cx(
            "absolute bottom-3 size-1.5 -translate-x-1/2 rounded-full",
            mark <= progress + 1e-9 && !disabled ? "bg-timed" : "bg-border-strong",
          )}
          style={{ left: PADDING + mark * inner }}
        />
      ))}

      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Word sync position"
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
