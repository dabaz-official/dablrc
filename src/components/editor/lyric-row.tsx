"use client";

import { X } from "lucide-react";
import { memo, useEffect, useRef, useState, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { isTimed, type LineEntry } from "@/lib/dmll/model";
import type { SyncMode, TokenRef } from "@/lib/dmll/sync";
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
  /** Word mode paints each word by its own timing; line mode paints the whole row. */
  mode: SyncMode;
  time: number;
  /** The word being edited in place, or -1. */
  editing: number;
  onActivate: (entry: number, start: number | undefined) => void;
  onSelectToken: (ref: TokenRef, start: number | undefined) => void;
  onEditToken: (ref: TokenRef) => void;
  onCommitToken: (ref: TokenRef, text: string) => void;
  onCancelEdit: () => void;
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

/**
 * Timed words are blue and untimed ones stay dim. The word being sung (or one
 * that started but has no end yet) carries a pale blue wash, the next word to
 * stamp is underlined, and the selected word is ringed. Line mode paints the
 * row instead, so the words keep a single colour.
 */
function tokenClass(token: Token, mode: SyncMode, time: number, isCursor: boolean, isSelected: boolean): string {
  const timed = token.start !== undefined;
  const open = token.start !== undefined && token.end === undefined;
  const singing = token.start !== undefined && token.end !== undefined && time >= token.start && time < token.end;

  return cx(
    "select-none whitespace-pre rounded-xs py-0.5 transition-colors touch-manipulation sm:py-0",
    mode === "word" && (timed ? "text-timed" : "text-text-tertiary"),
    mode === "word" && (open || singing) && "bg-timed-subtle",
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
  mode,
  time,
  editing,
  onActivate,
  onSelectToken,
  onEditToken,
  onCommitToken,
  onCancelEdit,
  onSeek,
  onToggleVoice,
  onToggleAdlib,
  onClearTiming,
}: LyricRowProps) {
  const { tokens, start } = entry;
  const isAdlib = entry.kind === "adlib";
  const right = voice === "right";

  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  /** Set by Escape so the blur that follows cancels instead of committing. */
  const cancelled = useRef(false);

  // Opening the editor starts from the word without its trailing space, ready to
  // be replaced: focus and select, so typing overwrites the whole word.
  useEffect(() => {
    if (editing < 0) return;
    const token = tokens[editing];
    if (!token) return;
    setDraft(token.text.trim());
    cancelled.current = false;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing, tokens]);

  function commit() {
    if (editing < 0) return;
    if (cancelled.current) {
      cancelled.current = false;
      onCancelEdit();
      return;
    }
    onCommitToken({ entry: index, token: editing }, draft);
  }

  return (
    <li
      id={`line-${index}`}
      onClick={() => onActivate(index, start)}
      className={cx(
        "group flex cursor-default flex-wrap items-start gap-x-2 gap-y-2 rounded-md px-2 py-1.5 sm:flex-nowrap sm:gap-2 sm:py-0.5",
        isActive ? "bg-surface-secondary" : "hover:bg-surface-secondary/60",
      )}
    >
      <span className="hidden h-7 w-6 shrink-0 items-center justify-end font-mono text-xs tabular-nums text-text-tertiary sm:flex">
        {isAdlib ? "↳" : number}
      </span>

      {isAdlib && <span aria-hidden="true" className="hidden size-7 shrink-0 sm:block" />}

      {/* Below `sm` the number moves to the controls line, under the text. */}
      <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-text-tertiary sm:hidden">
        {isAdlib ? "↳" : number}
      </span>

      {!isAdlib && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-11 font-mono text-xs sm:size-7"
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
        className="h-11 w-20 text-xs text-text-tertiary sm:h-7 sm:w-16"
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
        className="flex h-11 w-20 shrink-0 items-center text-left font-mono text-xs tabular-nums text-text-secondary hover:text-text-primary disabled:text-text-tertiary sm:h-7"
      >
        {start === undefined ? "--:--.--" : formatTime(start)}
      </button>

      <p
        className={cx(
          "order-first min-w-0 basis-full leading-7 sm:order-none sm:flex-1 sm:basis-auto",
          right && "text-right",
          isAdlib ? "pl-4 text-sm" : "text-base",
          mode === "line" && (start !== undefined ? "text-timed" : "text-text-tertiary"),
        )}
      >
        {tokens.map((token, tokenIndex) =>
          tokenIndex === editing ? (
            <input
              key={tokenIndex}
              ref={inputRef}
              value={draft}
              size={Math.max(4, draft.length)}
              spellCheck={false}
              aria-label={`Edit ${token.text.trim()}`}
              className="field-sizing-content min-w-6 rounded-xs bg-background px-0.5 text-text-primary ring-1 ring-focus outline-none"
              onChange={(event) => setDraft(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  cancelled.current = true;
                  event.currentTarget.blur();
                }
              }}
            />
          ) : (
            <button
              key={tokenIndex}
              type="button"
              tabIndex={-1}
              title={`${describeToken(token)} — double-click to edit`}
              onClick={(event) => {
                stop(event);
                onSelectToken({ entry: index, token: tokenIndex }, token.start);
              }}
              onDoubleClick={(event) => {
                stop(event);
                onEditToken({ entry: index, token: tokenIndex });
              }}
              className={tokenClass(token, mode, time, tokenIndex === cursor, tokenIndex === selected)}
            >
              {token.text}
            </button>
          ),
        )}
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
          className="size-11 opacity-100 focus-visible:opacity-100 sm:size-7 sm:opacity-0 sm:group-hover:opacity-100"
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
