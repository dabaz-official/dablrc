"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import { cx } from "@/lib/cx";
import { formatTime } from "@/lib/dmll/time";
import { peaksInRange } from "@/lib/waveform";

import type { WaveformState } from "./use-waveform";

const HEIGHT = 56;
/** The strip at the bottom that holds the line ticks. */
const TICK_AREA = 8;

interface WaveformProps {
  /** The track's peaks and whether they are ready. */
  waveform: WaveformState;
  duration: number;
  time: number;
  /** Start times of the timed lines, drawn as ticks. */
  lines: number[];
  /** The start of the line being synced, drawn stronger. */
  activeStart?: number;
  /** Seconds in view; `Infinity` shows the whole track. */
  span: number;
  onSeek: (time: number) => void;
  className?: string;
}

interface Colors {
  rest: string;
  played: string;
  tick: string;
  playhead: string;
}

/** Colours come from the semantic tokens, so the waveform follows the theme. */
function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const value = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    rest: value("--dz-color-text-tertiary", "#737373"),
    played: value("--dz-color-text-primary", "#171717"),
    tick: value("--dz-color-text-tertiary", "#737373"),
    playhead: value("--dz-color-focus", "#4c89ef"),
  };
}

/**
 * The track's peaks with the playhead, the timed lines and a click/drag seek.
 * The window follows the playhead, so a zoomed view keeps a word-sized gap
 * visible instead of squeezing four minutes into one screen.
 */
export function Waveform({
  waveform,
  duration,
  time,
  lines,
  activeStart,
  span,
  onSeek,
  className,
}: WaveformProps) {
  const { peaks, loading, failed } = waveform;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [width, setWidth] = useState(0);
  /** Bumped when the theme class changes, so the canvas re-reads the tokens. */
  const [theme, setTheme] = useState(0);

  useEffect(() => {
    // Watching the class, not `resolvedTheme`, because next-themes applies the
    // class to <html> and the canvas must read the tokens after it does.
    const observer = new MutationObserver(() => setTheme((value) => value + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const total = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const full = !Number.isFinite(span) || span >= total;
  const windowSpan = full ? total : Math.min(span, total);
  const from = full ? 0 : Math.min(Math.max(0, time - windowSpan / 2), Math.max(0, total - windowSpan));
  const to = from + windowSpan;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, HEIGHT);

    const colors = readColors();
    const area = HEIGHT - TICK_AREA;
    const playX =
      windowSpan > 0 ? ((Math.min(Math.max(time, from), to) - from) / windowSpan) * width : 0;

    if (!peaks || peaks.length === 0 || total <= 0) {
      // No picture yet: a plain progress line, so seeking still works.
      ctx.fillStyle = colors.rest;
      ctx.fillRect(0, area / 2 - 1, width, 2);
      ctx.fillStyle = colors.played;
      ctx.fillRect(0, area / 2 - 1, playX, 2);
    } else {
      const bars = Math.max(40, Math.floor(width / 3));
      const barWidth = width / bars;
      const values = peaksInRange(peaks, from / total, to / total, bars);

      for (let bar = 0; bar < bars; bar++) {
        const barHeight = Math.max(2, values[bar] * area);
        const x = bar * barWidth;
        ctx.fillStyle = x + barWidth <= playX ? colors.played : colors.rest;
        ctx.fillRect(x, (area - barHeight) / 2, Math.max(barWidth - 1, 1), barHeight);
      }
    }

    if (windowSpan > 0) {
      for (const line of lines) {
        if (line < from || line > to) continue;
        const active = activeStart !== undefined && Math.abs(line - activeStart) < 0.005;
        ctx.fillStyle = active ? colors.playhead : colors.tick;
        ctx.fillRect(Math.round(((line - from) / windowSpan) * width), HEIGHT - TICK_AREA, 1, active ? TICK_AREA : 4);
      }
    }

    ctx.fillStyle = colors.playhead;
    ctx.fillRect(Math.round(playX), 0, 1, area);
  }, [peaks, total, width, time, from, to, windowSpan, lines, activeStart, theme]);

  function seekFrom(clientX: number) {
    const wrap = wrapRef.current;
    if (!wrap || windowSpan <= 0) return;
    const rect = wrap.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(from + ratio * windowSpan);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (total <= 0) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFrom(event.clientX);
  }

  return (
    <div
      ref={wrapRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={formatTime(time)}
      title={
        failed
          ? "The waveform could not be read; click or drag to seek"
          : loading
            ? "Reading the waveform…"
            : "Click or drag to seek"
      }
      className={cx("cursor-pointer touch-none select-none", className)}
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
        const step = event.shiftKey ? 5 : 1;
        let next: number;
        if (event.key === "ArrowLeft") next = time - step;
        else if (event.key === "ArrowRight") next = time + step;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = total;
        else return;
        // The editor's global keys also seek with the arrows.
        event.preventDefault();
        event.stopPropagation();
        onSeek(Math.min(total, Math.max(0, next)));
      }}
    >
      <canvas ref={canvasRef} className="block" style={{ width: "100%", height: HEIGHT }} />
    </div>
  );
}
