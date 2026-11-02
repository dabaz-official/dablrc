"use client";

import { X } from "lucide-react";
import { memo, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { isTimed, type LineEntry } from "@/lib/dmll/model";
import type { TokenRef } from "@/lib/dmll/sync";
import { formatTime } from "@/lib/dmll/time";
import type { Token, Voice } from "@/lib/dmll/types";

export interface LyricRowProps {
  index: number;
  entry: LineEntry;
  /** 1-based number among the lyric lines. Ad-libs have none. */
  number?: number;
  voice: Voice;
  isActive: boolean;
  /** The token the next tap writes to, when this is the active line; otherwise -1. */
  cursor: number;
  /** The selected token of this line, or -1. */
  selected: number;
  /** Whether to hint that Enter moves on, shown when nothing is left to stamp. */
  endHint: boolean;
  time: number;
  onActivate: (entry: number, start: number | undefined) => void;
  onSelectToken: (ref: TokenRef, start: number | undefined) => void;
  onSeek: (time: number) => void;
  onToggleVoice: (entry: number) => void;
  onToggleAdlib: (entry: number) => void;
  onClearTiming: (entry: number) => void;
}

/** Keeps a control's click from also activating the row it sits in. */
function stop(event: MouseEvent) {
  event.stopPropagation();
}

function describeToken({ start, end }: Token): string {
  if (start === undefined) return "Untimed";
  return `${formatTime(start)} to ${end === undefined ? "open" : formatTime(end)}`;
}

/** Sung words are bright, the word being sung is shaded, and the rest stay dim. */
function tokenClass({ start, end }: Token, time: number, isCursor: boolean, isSelected: boolean): string {
  let tone = "text-text-tertiary";
  if (start !== undefined) {
    if (end !== undefined && time >= end) tone = "text-text-primary";
    else if (time >= start) tone = "bg-primary-subtle text-text-primary";
    else tone = "text-text-secondary";
  }
  return cx(
    "whitespace-pre rounded-xs transition-colors",
    tone,
    isCursor && "underline decoration-focus decoration-2 underline-offset-4",
    isSelected && "ring-1 ring-focus",
  );
}

export const LyricRow = memo(function LyricRow({
  index,
  entry,
  number,
  voice,
  isActive,
  cursor,
  selected,
  endHint,
  time,
  onActivate,
  onSelectToken,
  onSeek,
  onToggleVoice,
  onToggleAdlib,
  onClearTiming,
}: LyricRowProps) {
  const { tokens, start } = entry;
  const isAdlib = entry.kind === "adlib";
  const right = voice === "right";

  return (
    <li
      id={`line-${index}`}
      onClick={() => onActivate(index, start)}
      className={cx(
        "group flex cursor-default items-start gap-2 rounded-md px-2 py-0.5",
        isActive ? "bg-surface-secondary" : "hover:bg-surface-secondary/60",
      )}
    >
      <span className="flex h-7 w-6 shrink-0 items-center justify-end font-mono text-xs tabular-nums text-text-tertiary">
        {isAdlib ? "↳" : number}
      </span>

      {isAdlib && <span aria-hidden="true" className="size-7 shrink-0" />}

      {!isAdlib && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="font-mono text-xs"
          title={`Side: ${voice}. Click to switch.`}
          onClick={(event) => {
            stop(event);
            onToggleVoice(index);
          }}
        >
          {right ? "R" : "L"}
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="w-16 text-xs text-text-tertiary"
        title={isAdlib ? "Turn into a lyric line" : "Turn into an ad-lib under the line above"}
        onClick={(event) => {
          stop(event);
          onToggleAdlib(index);
        }}
      >
        {isAdlib ? "Lyric" : "Ad-lib"}
      </Button>

      <button
        type="button"
        tabIndex={-1}
        disabled={start === undefined}
        title="Seek to this line"
        onClick={(event) => {
          stop(event);
          if (start !== undefined) onSeek(start);
        }}
        className="flex h-7 w-20 shrink-0 items-center text-left font-mono text-xs tabular-nums text-text-secondary hover:text-text-primary disabled:text-text-tertiary"
      >
        {start === undefined ? "--:--.--" : formatTime(start)}
      </button>

      <p
        className={cx("min-w-0 flex-1 leading-7", right && "text-right", isAdlib ? "pl-4 text-sm" : "text-base")}
      >
        {tokens.map((token, tokenIndex) => (
          <button
            key={tokenIndex}
            type="button"
            tabIndex={-1}
            title={describeToken(token)}
            onClick={(event) => {
              stop(event);
              onSelectToken({ entry: index, token: tokenIndex }, token.start);
            }}
            className={tokenClass(token, time, tokenIndex === cursor, tokenIndex === selected)}
          >
            {token.text}
          </button>
        ))}
        {endHint && (
          <span className="ml-2 select-none rounded-xs border border-border px-1 align-middle text-xs text-text-tertiary">
            Enter ↵
          </span>
        )}
      </p>

      {isTimed(entry) && (
        <Button
          size="icon-sm"
          variant="ghost"
          title="Clear timing"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          onClick={(event) => {
            stop(event);
            onClearTiming(index);
          }}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </li>
  );
});
