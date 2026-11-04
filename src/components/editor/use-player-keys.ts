"use client";

import { useEffect } from "react";

import { codeOf, isTypingTarget, releaseFocus } from "./keyboard";

interface PlayerKeys {
  onTogglePlay: () => void;
  onUndo: () => void;
}

/**
 * Space plays or pauses anywhere outside the text editor; Cmd/Ctrl+Z undoes a
 * timing change. The textarea keeps its native undo and space handling.
 */
export function usePlayerKeys({ onTogglePlay, onUndo }: PlayerKeys) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || isTypingTarget(event.target)) return;

      if (event.metaKey || event.ctrlKey) {
        if (event.code === "KeyZ" && !event.shiftKey) {
          event.preventDefault();
          onUndo();
        }
        return;
      }

      if (codeOf(event) !== "Space" || event.repeat) return;
      releaseFocus();
      event.preventDefault();
      onTogglePlay();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onTogglePlay, onUndo]);
}
