"use client";

import { cx } from "@/lib/cx";
import type { LineEntry } from "@/lib/dmll/model";
import type { SyncMode } from "@/lib/dmll/sync";
import { formatTime } from "@/lib/dmll/time";
import type { Token } from "@/lib/dmll/types";

interface FocusLineProps {
  entry: LineEntry;
  /** 1-based number among the lyric lines. Ad-libs have none. */
  number?: number;
  /** How many lyric lines the file has. */
  total: number;
  mode: SyncMode;
  /** The word the next sync writes to; `tokens.length` means the line's end. */
  word: number;
  /** The word the user last clicked, if any. */
  selected: number;
  /** The marker time, used to wash the word being sung. */
  time: number;
  onSelectWord: (index: number) => void;
}

function describeToken({ start, end }: Token): string {
  if (start === undefined) return "Untimed";
  return `${formatTime(start)} to ${end === undefined ? "open" : formatTime(end)} — click to select`;
}

/** The one line the focus editor shows, with its words as buttons in word mode. */
export function FocusLine({ entry, number, total, mode, word, selected, time, onSelectWord }: FocusLineProps) {
  const isAdlib = entry.kind === "adlib";

  return (
    <div
      aria-live="polite"
      className="flex w-full max-w-3xl flex-col items-center gap-5 px-1 text-center"
      data-testid="focus-line"
      data-line-kind={isAdlib ? "adlib" : "lyric"}
      data-line-start={entry.start ?? ""}
      data-word={word}
    >
      <p className="flex items-center gap-2 text-xs tabular-nums text-text-tertiary">
        {isAdlib ? (
          <span className="rounded-full border border-border px-2 py-0.5 font-medium">Ad-lib</span>
        ) : (
          <span>
            Line {number ?? "—"} of {total}
          </span>
        )}
        {entry.start !== undefined && <span>{formatTime(entry.start)}</span>}
      </p>

      <p
        className={cx(
          "text-balance text-2xl leading-8 sm:text-[2rem] sm:leading-10",
          mode === "line" && (entry.start !== undefined ? "text-timed" : "text-text-tertiary"),
        )}
      >
        {entry.tokens.map((token, index) => {
          if (mode === "line") {
            return (
              <span key={index} className="whitespace-pre">
                {token.text}
              </span>
            );
          }

          const timed = token.start !== undefined;
          const open = token.start !== undefined && token.end === undefined;
          const singing =
            token.start !== undefined && token.end !== undefined && time >= token.start && time < token.end;

          return (
            <button
              key={index}
              type="button"
              title={describeToken(token)}
              aria-current={index === word ? "true" : undefined}
              aria-label={`${token.text.trim()}, ${describeToken(token)}`}
              onClick={() => onSelectWord(index)}
              className={cx(
                "whitespace-pre rounded-xs py-1.5 transition-colors touch-manipulation sm:py-0.5",
                timed ? "text-timed" : "text-text-tertiary",
                (open || singing) && "bg-timed-subtle",
                index === word && "underline decoration-focus decoration-2 underline-offset-8",
                index === selected && "ring-1 ring-focus",
              )}
            >
              {token.text}
            </button>
          );
        })}
      </p>
    </div>
  );
}
