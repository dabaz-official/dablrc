"use client";

import { Button } from "@/components/ui/button";

interface SyncPadProps {
  enabled: boolean;
  /** When on, Tap runs from press to release instead of tapping. */
  hold: boolean;
  canUndo: boolean;
  onTap: () => void;
  onEndWord: () => void;
  onEndLine: () => void;
  onUndo: () => void;
}

/**
 * The sync controls for a finger. A phone has no keyboard, so tapping a word
 * needs a button of its own; shown below the `sm` breakpoint.
 */
export function SyncPad({ enabled, hold, canUndo, onTap, onEndWord, onEndLine, onUndo }: SyncPadProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:hidden">
      <Button
        variant="primary"
        className="h-11 whitespace-nowrap text-sm"
        disabled={!enabled}
        title={hold ? "Hold to time a word from press to release" : "Time the next word"}
        onPointerDown={() => onTap()}
        onPointerUp={() => {
          if (hold) onEndWord();
        }}
        onPointerCancel={() => {
          if (hold) onEndWord();
        }}
        onPointerLeave={() => {
          if (hold) onEndWord();
        }}
      >
        Tap
      </Button>
      <Button className="h-11 whitespace-nowrap text-xs" disabled={!enabled} onClick={onEndWord}>
        End word
      </Button>
      <Button className="h-11 whitespace-nowrap text-xs" disabled={!enabled} onClick={onEndLine}>
        End line
      </Button>
      <Button className="h-11 whitespace-nowrap text-xs" disabled={!canUndo} onClick={onUndo}>
        Undo
      </Button>
    </div>
  );
}
