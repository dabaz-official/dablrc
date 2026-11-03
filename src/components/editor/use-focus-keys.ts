"use client";

import { useEffect } from "react";

import { cycleRate, type PlaybackRate } from "@/lib/playback";

import { codeOf, isTypingTarget, releaseFocus } from "./keyboard";

const NUDGE = 0.01;
const COARSE_NUDGE = 0.1;

interface FocusKeys {
  rate: PlaybackRate;
  onRateChange: (rate: PlaybackRate) => void;
  /** Moves the sync marker by `delta` seconds. */
  onNudge: (delta: number) => void;
  /** Writes the marker at the current unit and advances. */
  onCommit: () => void;
  onTogglePlay: () => void;
  /** Moves one line up (`-1`) or down (`1`). */
  onNavigate: (direction: -1 | 1) => void;
  onUndo: () => void;
}

/**
 * The focus editor's keys. The arrows are the desktop version of dragging the
 * waveform: they nudge the marker in 10 ms steps (Shift: 100 ms), and Enter
 * writes it. Space plays, Up/Down change line, Backspace undoes, and the
 * bracket keys step the speed. The legacy editor keeps its own map.
 */
export function useFocusKeys({
  rate,
  onRateChange,
  onNudge,
  onCommit,
  onTogglePlay,
  onNavigate,
  onUndo,
}: FocusKeys) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || isTypingTarget(event.target)) return;

      if (event.metaKey || event.ctrlKey) {
        // Undo is the one shortcut the editor takes; the rest belong to the browser.
        if (event.code === "KeyZ" && !event.shiftKey) {
          event.preventDefault();
          onUndo();
        }
        return;
      }

      const nudgeBy = event.shiftKey ? COARSE_NUDGE : NUDGE;
      const code = codeOf(event);
      let handled = true;

      switch (code) {
        case "Space":
          if (event.repeat) break;
          releaseFocus();
          onTogglePlay();
          break;
        case "Enter":
          if (event.repeat) break;
          releaseFocus();
          onCommit();
          break;
        case "Backspace":
          onUndo();
          break;
        case "ArrowLeft":
          onNudge(-nudgeBy);
          break;
        case "ArrowRight":
          onNudge(nudgeBy);
          break;
        case "ArrowUp":
          onNavigate(-1);
          break;
        case "ArrowDown":
          onNavigate(1);
          break;
        case "BracketLeft":
          onRateChange(cycleRate(rate, -1));
          break;
        case "BracketRight":
          onRateChange(cycleRate(rate, 1));
          break;
        default:
          handled = false;
      }

      if (handled) event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rate, onRateChange, onNudge, onCommit, onTogglePlay, onNavigate, onUndo]);
}
