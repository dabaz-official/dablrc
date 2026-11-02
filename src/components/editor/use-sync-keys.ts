"use client";

import { useEffect, type Dispatch } from "react";

import type { Action, SyncMode } from "@/lib/dmll/sync";
import { cycleRate, type PlaybackRate } from "@/lib/playback";

const SEEK_STEP = 2;
const COARSE_SEEK_STEP = 10;
const NUDGE = 0.01;
const COARSE_NUDGE = 0.1;

/** Input types where typing does not happen, so the editor keys still apply. */
const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "range", "button", "submit", "reset", "file", "color"]);

interface SyncKeys {
  dispatch: Dispatch<Action>;
  mode: SyncMode;
  hasAudio: boolean;
  rate: PlaybackRate;
  onRateChange: (rate: PlaybackRate) => void;
  currentTime: () => number;
  seek: (time: number) => void;
  togglePlay: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type);
}

/** Takes focus off a button, so Space and Enter are not also clicks. */
function releaseFocus() {
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
}

/**
 * The sync keys. Space taps the next word, Enter ends the line, Shift+Space ends
 * the word for a pause, and Backspace undoes. The arrows seek; S and E re-stamp
 * the selected word; the punctuation keys nudge it. Keys are read by position
 * (`event.code`), so they work on any keyboard layout.
 */
export function useSyncKeys({
  dispatch,
  mode,
  hasAudio,
  rate,
  onRateChange,
  currentTime,
  seek,
  togglePlay,
}: SyncKeys) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || isTypingTarget(event.target)) return;

      if (event.metaKey || event.ctrlKey) {
        // Undo is the one shortcut the editor takes; the rest belong to the browser.
        if (event.code === "KeyZ" && !event.shiftKey) {
          event.preventDefault();
          dispatch({ type: "undo" });
        }
        return;
      }

      const time = currentTime();
      const coarse = event.shiftKey;
      const seekBy = coarse ? COARSE_SEEK_STEP : SEEK_STEP;
      const nudgeBy = coarse ? COARSE_NUDGE : NUDGE;
      let handled = true;

      switch (event.code) {
        case "Space":
          // Without audio there is no playhead to tap against, so Space does nothing.
          if (event.repeat || !hasAudio) break;
          releaseFocus();
          dispatch(coarse ? { type: "endWord", time } : { type: "tap", time, mode });
          break;
        case "Enter":
          if (event.repeat) break;
          releaseFocus();
          dispatch({ type: "closeLine", time });
          break;
        case "Backspace":
          dispatch({ type: "undo" });
          break;
        case "KeyP":
          togglePlay();
          break;
        case "ArrowLeft":
          seek(time - seekBy);
          break;
        case "ArrowRight":
          seek(time + seekBy);
          break;
        case "KeyS":
          dispatch({ type: "restamp", edge: "start", time });
          break;
        case "KeyE":
          dispatch({ type: "restamp", edge: "end", time });
          break;
        case "BracketLeft":
          onRateChange(cycleRate(rate, -1));
          break;
        case "BracketRight":
          onRateChange(cycleRate(rate, 1));
          break;
        case "Comma":
          dispatch({ type: "nudge", edge: "start", delta: -nudgeBy });
          break;
        case "Period":
          dispatch({ type: "nudge", edge: "start", delta: nudgeBy });
          break;
        case "Semicolon":
          dispatch({ type: "nudge", edge: "end", delta: -nudgeBy });
          break;
        case "Quote":
          dispatch({ type: "nudge", edge: "end", delta: nudgeBy });
          break;
        default:
          handled = false;
      }

      if (handled) event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, mode, hasAudio, rate, onRateChange, currentTime, seek, togglePlay]);
}
