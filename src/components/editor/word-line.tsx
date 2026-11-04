"use client";

import { useMemo, useRef, useState } from "react";

import { cx } from "@/lib/cx";
import { lineEndAt, lineNumbers, nextLine, isLine, type LineEntry } from "@/lib/dmll/model";
import { formatTime } from "@/lib/dmll/time";
import type { Token } from "@/lib/dmll/types";
import { syncWordTimings, wordBoundaries, wordIndexAt, type WordSample } from "@/lib/dmll/word-sync";

import type { EditorController } from "./use-editor";
import { WordSlider } from "./word-slider";

interface WordLineProps {
  editor: EditorController;
  index: number;
  entry: LineEntry;
}

/**
 * One line in the Word tab: the line itself, the progress rail, and the gesture
 * that turns a forward drag into word timings. The rail is the whole line; the
 * words split it by their text length, and the cursor's position is the time.
 * The line's committed data is the source of truth; the preview here is local
 * until a release.
 */
export function WordLine({ editor, index, entry }: WordLineProps) {
  const { playback, dispatch, activate } = editor;
  const { currentTime, duration, hasAudio } = playback;

  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<Token[]>(entry.tokens);
  const [previewStart, setPreviewStart] = useState<number | undefined>(entry.start);
  const [source, setSource] = useState({ tokens: entry.tokens, start: entry.start });

  // Adopt changes from outside (undo, the Line tab, an import). Our own commit
  // stores the exact preview array, so it is recognised and keeps the gesture.
  if (source.tokens !== entry.tokens || source.start !== entry.start) {
    setSource({ tokens: entry.tokens, start: entry.start });
    if (entry.tokens !== preview) {
      setPreview(entry.tokens);
      setPreviewStart(entry.start);
      setProgress(0);
    } else {
      setPreviewStart(entry.start);
    }
  }

  const started = useRef(false);
  const base = useRef<Token[]>(entry.tokens);
  const samples = useRef<WordSample[]>([]);
  const gestureLeft = useRef<number | undefined>(entry.start);
  const gestureRight = useRef<number | undefined>(undefined);
  const maxProgress = useRef(0);

  const count = preview.length;
  const boundaries = useMemo(() => wordBoundaries(preview), [preview]);
  const word = wordIndexAt(progress, boundaries);
  const start = previewStart ?? entry.start;
  const end = lineEndAt(editor.lyrics, index);
  const number = lineNumbers(editor.lyrics)[index];
  const isAdlib = entry.kind === "adlib";

  /** The line's time at a position on the rail. */
  function clockAt(point: number): number {
    const left = gestureLeft.current ?? entry.start ?? 0;
    const right = gestureRight.current ?? (duration > left ? duration : left + 10);
    return left + Math.min(1, Math.max(0, point)) * Math.max(0, right - left);
  }

  function startGesture() {
    if (!hasAudio || count === 0) return;

    const now = currentTime();
    gestureLeft.current = entry.start ?? now;
    gestureRight.current =
      lineEndAt(editor.lyrics, index) ?? (duration > gestureLeft.current ? duration : gestureLeft.current + 10);
    maxProgress.current = progress;

    if (progress <= 0) {
      base.current = entry.tokens.map(({ text }) => ({ text }));
    } else {
      base.current = preview;
    }

    started.current = true;
    samples.current = [{ progress, time: clockAt(progress) }];

    const tokens = syncWordTimings(base.current, samples.current);
    setPreview(tokens);
    if (entry.start === undefined) {
      const first = tokens.find((token) => token.start !== undefined)?.start;
      if (first !== undefined) setPreviewStart(first);
    }
  }

  function addSample(point: number) {
    if (!started.current) return;
    const next = Math.max(maxProgress.current, Math.min(1, point));
    if (next <= maxProgress.current) return;

    maxProgress.current = next;
    samples.current = [...samples.current, { progress: next, time: clockAt(next) }];
    const tokens = syncWordTimings(base.current, samples.current);
    setPreview(tokens);
    if (entry.start === undefined) {
      const first = tokens.find((token) => token.start !== undefined)?.start;
      if (first !== undefined) setPreviewStart(first);
    }
    setProgress(next);
  }

  function finish(finalProgress = progress) {
    if (!started.current) startGesture();
    if (!started.current) return;

    const point = Math.max(maxProgress.current, Math.min(1, finalProgress));
    maxProgress.current = point;
    samples.current = [...samples.current, { progress: point, time: clockAt(point) }];

    const complete = point >= 0.995;
    const tokens = syncWordTimings(base.current, samples.current, {
      finalize: true,
      endTime: complete ? lineEndAt(editor.lyrics, index) : undefined,
    });
    const nextStart = previewStart ?? entry.start ?? tokens.find((token) => token.start !== undefined)?.start;

    setPreview(tokens);
    setPreviewStart(nextStart);
    setProgress(point);
    started.current = false;
    samples.current = [];

    dispatch({ type: "setLineWords", entry: index, start: nextStart, tokens });

    if (complete) {
      const next = nextLine(editor.lyrics, index);
      if (next >= 0) {
        const following = editor.lyrics[next];
        activate(next, isLine(following) ? following.start : undefined);
      }
    }
  }

  function cancel() {
    started.current = false;
    samples.current = [];
    setPreview(entry.tokens);
    setPreviewStart(entry.start);
    setProgress(0);
  }

  function step() {
    if (!started.current) {
      startGesture();
      return;
    }
    const next = boundaries.find((boundary) => boundary > maxProgress.current + 1e-9);
    if (next === undefined) return;
    addSample(next);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="flex flex-wrap items-center justify-center gap-2 text-xs tabular-nums text-text-tertiary">
          {isAdlib ? (
            <span className="rounded-full border border-border px-2 py-0.5 font-medium">Ad-lib</span>
          ) : (
            <span>
              Line {number ?? "—"} of {editor.summary.lyrics}
            </span>
          )}
          <span>
            Word {count > 0 ? Math.min(word + 1, count) : 0} / {count}
          </span>
        </p>

        <p
          aria-live="polite"
          className="max-w-3xl text-balance text-2xl leading-8 sm:text-[2rem] sm:leading-10"
        >
          {preview.map((token, tokenIndex) => {
            const timed = token.start !== undefined;
            const open = token.start !== undefined && token.end === undefined;
            return (
              <span
                key={tokenIndex}
                className={cx(
                  "whitespace-pre rounded-xs py-0.5",
                  timed ? "text-timed" : "text-text-tertiary",
                  (open || tokenIndex === word) && "bg-timed-subtle",
                  tokenIndex === word && "underline decoration-focus decoration-2 underline-offset-8",
                )}
              >
                {token.text}
              </span>
            );
          })}
        </p>
      </div>

      <div className="w-full max-w-3xl">
        <div className="mb-2 flex items-center justify-between font-mono text-xs tabular-nums text-text-tertiary">
          <span>{start === undefined ? "--:--.--" : formatTime(start)}</span>
          <span className="font-sans text-[11px] uppercase tracking-wide">Drag forward</span>
          <span>{end === undefined ? "--:--.--" : formatTime(end)}</span>
        </div>

        <WordSlider
          wordCount={count}
          boundaries={boundaries}
          progress={progress}
          activeWord={word}
          disabled={!hasAudio || count === 0}
          onStart={startGesture}
          onProgress={addSample}
          onRelease={finish}
          onCancel={cancel}
          onStep={step}
          onCommit={() => finish()}
        />

        <p className="mt-3 text-center text-xs text-text-tertiary">
          {hasAudio
            ? "The whole bar is this line. Drag from left to right through the word marks; it never moves back."
            : "Open the audio to sync words."}
        </p>
      </div>
    </div>
  );
}
