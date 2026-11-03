"use client";

import { ChevronDown, ChevronUp, FileText, Pause, Play, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import {
  isLine,
  lineNumbers,
  nextLine,
  previousLine,
  type LineEntry,
} from "@/lib/dmll/model";
import { isTimedSource } from "@/lib/dmll/parse";
import type { SyncMode } from "@/lib/dmll/sync";
import { formatTime } from "@/lib/dmll/time";
import { PLAYBACK_RATES, type PlaybackRate } from "@/lib/playback";

import { FocusLine } from "./focus-line";
import { LyricsInput } from "./lyrics-input";
import type { EditorController } from "./use-editor";
import { useFocusKeys } from "./use-focus-keys";
import { Waveform } from "./waveform";

/** Seconds of track the focus waveform shows; `Infinity` is the whole track. */
const SPANS = [
  { value: 8, label: "8s", title: "Show 8 seconds around the marker" },
  { value: 20, label: "20s", title: "Show 20 seconds around the marker" },
  { value: Number.POSITIVE_INFINITY, label: "All", title: "Show the whole track" },
];

const MODES: Array<{ value: SyncMode; label: string }> = [
  { value: "word", label: "Word" },
  { value: "line", label: "Line" },
];

/** The values the key handler reads from the latest render. */
interface KeyState {
  line?: LineEntry;
  active: number;
  cursor: number;
  word: number;
  mode: SyncMode;
  preview?: number;
  markerTime: number;
  unitStart?: number;
  time: number;
  duration: number;
  hasAudio: boolean;
  playing: boolean;
}

interface FocusEditorProps {
  editor: EditorController;
}

/**
 * One line at a time. The waveform below is both the progress and the sync
 * control: drag it (or nudge with the arrows) and it sets the marker, release
 * (or Enter) to write the line and move on.
 */
export function FocusEditor({ editor }: FocusEditorProps) {
  const {
    lyrics,
    active,
    cursor,
    selected,
    summary,
    playback,
    waveform,
    mode,
    setMode,
    showPanel,
    setPanelOpen,
    text,
    setText,
    applyText,
    editLyrics,
    estimate,
    undo,
    activate,
    selectToken,
    dispatch,
    canUndo,
  } = editor;
  const { time, duration, playing, hasAudio, rate, setRate, seek, togglePlay } = playback;
  const { file } = playback;

  const entry = lyrics[active];
  const line = isLine(entry) ? entry : undefined;
  const numbers = useMemo(() => lineNumbers(lyrics), [lyrics]);

  const firstOpen = line ? line.tokens.findIndex((token) => token.start === undefined) : -1;
  const derivedWord = line ? (firstOpen >= 0 ? firstOpen : line.tokens.length) : 0;

  /** The word the user picked, keyed to the line and mode it belongs to. */
  const [pick, setPick] = useState<{ entry: number; mode: SyncMode; word: number }>();
  /** The time being previewed by a drag or an arrow; not written until commit. */
  const [previewDraft, setPreviewDraft] = useState<{ entry: number; mode: SyncMode; time: number }>();
  const [span, setSpan] = useState<number>(SPANS[0].value);

  const pickedWord = pick && pick.entry === active && pick.mode === mode ? pick.word : undefined;
  const preview = previewDraft && previewDraft.entry === active && previewDraft.mode === mode ? previewDraft.time : undefined;
  const word = pickedWord !== undefined && line ? Math.min(pickedWord, line.tokens.length) : derivedWord;
  const markerTime = preview ?? time;

  const unitStart = useMemo(() => {
    if (!line) return undefined;
    if (mode === "line") return line.start;

    const last = line.tokens[line.tokens.length - 1];
    if (word < line.tokens.length) return line.tokens[word]?.start;
    // At the line end, an open last word starts from the playhead; a complete
    // one starts from where it ended.
    return last ? last.end : line.start;
  }, [line, mode, word]);

  /** Word mode, all words started: the next sync ends the line. */
  const atLineEnd = mode === "word" && line !== undefined && word >= line.tokens.length;
  const lineEnd = line?.tokens[line.tokens.length - 1]?.end;

  const lineStarts = useMemo(
    () => lyrics.flatMap((item) => (isLine(item) && item.start !== undefined ? [item.start] : [])),
    [lyrics],
  );

  const stateRef = useRef<KeyState>({
    line,
    active,
    cursor,
    word,
    mode,
    preview,
    markerTime,
    unitStart,
    time,
    duration,
    hasAudio,
    playing,
  });
  useEffect(() => {
    stateRef.current = {
      line,
      active,
      cursor,
      word,
      mode,
      preview,
      markerTime,
      unitStart,
      time,
      duration,
      hasAudio,
      playing,
    };
  });

  // When a track is opened, start at the line being synced rather than at 0.
  // Switching views with the same track does not move the playhead.
  const seededFile = useRef(file);
  useEffect(() => {
    if (!file || duration <= 0 || seededFile.current === file) return;
    seededFile.current = file;
    const start = stateRef.current.line?.start;
    if (start !== undefined) seek(start);
  }, [file, duration, seek]);

  /** Writes the marker at `at` for the current line or word, then advances. */
  const commitAt = useCallback(
    (at: number) => {
      const state = stateRef.current;
      const target = state.line;
      if (!target || !state.hasAudio) return;

      const limit = state.duration > 0 ? state.duration : Number.POSITIVE_INFINITY;
      const stamp = Math.min(Math.max(0, at), limit);

      if (state.mode === "line") {
        dispatch({ type: "tap", time: stamp, mode: "line" });
        setPick(undefined);
      } else if (state.word < target.tokens.length) {
        if (state.word !== state.cursor) {
          dispatch({ type: "selectToken", ref: { entry: state.active, token: state.word }, time: stamp });
        }
        dispatch({ type: "tap", time: stamp, mode: "word" });

        const next = state.word + 1;
        setPick(next < target.tokens.length ? { entry: state.active, mode: state.mode, word: next } : undefined);
      } else {
        // Every word has its start, so this commit ends the line.
        dispatch({ type: "closeLine", time: stamp });
        setPick(undefined);
      }

      setPreviewDraft(undefined);
    },
    [dispatch],
  );

  const commitNow = useCallback(() => commitAt(stateRef.current.markerTime), [commitAt]);

  /** Moves the marker without writing it; the arrows use this. */
  const nudge = useCallback(
    (delta: number) => {
      const state = stateRef.current;
      if (!state.line || !state.hasAudio) return;
      if (state.playing) togglePlay();

      const base = state.preview ?? state.unitStart ?? state.time;
      const limit = state.duration > 0 ? state.duration : Number.POSITIVE_INFINITY;
      const next = Math.min(Math.max(0, base + delta), limit);
      setPreviewDraft({ entry: state.active, mode: state.mode, time: next });
      seek(next);
    },
    [seek, togglePlay],
  );

  const togglePlayback = useCallback(() => {
    setPreviewDraft(undefined);
    togglePlay();
  }, [togglePlay]);

  const navigate = useCallback(
    (direction: -1 | 1) => {
      const target = direction > 0 ? nextLine(lyrics, active) : previousLine(lyrics, active);
      if (target < 0) return;

      const nextEntry = lyrics[target];
      activate(target, isLine(nextEntry) ? nextEntry.start : undefined);
      setPreviewDraft(undefined);
      setPick(undefined);
    },
    [activate, active, lyrics],
  );

  const undoNow = useCallback(() => {
    setPreviewDraft(undefined);
    setPick(undefined);
    undo();
  }, [undo]);

  const review = useCallback(() => {
    const first = lyrics.findIndex((item) => isLine(item));
    if (first < 0) return;
    const item = lyrics[first];
    activate(first, isLine(item) ? item.start : undefined);
    setPreviewDraft(undefined);
    setPick(undefined);
  }, [activate, lyrics]);

  const selectWord = useCallback(
    (index: number) => {
      setPick({ entry: active, mode, word: index });
      setPreviewDraft(undefined);
      if (!line) return;
      selectToken({ entry: active, token: index }, line.tokens[index]?.start);
    },
    [active, line, mode, selectToken],
  );

  const handleSeek = useCallback(
    (to: number) => {
      setPreviewDraft({ entry: active, mode, time: to });
      seek(to);
    },
    [active, mode, seek],
  );

  const handleScrubStart = useCallback(() => {
    if (playing) togglePlay();
  }, [playing, togglePlay]);

  const handleScrubEnd = useCallback((at: number) => commitAt(at), [commitAt]);
  const handleScrubCancel = useCallback(() => setPreviewDraft(undefined), []);

  useFocusKeys({
    rate,
    onRateChange: setRate,
    onNudge: nudge,
    onCommit: commitNow,
    onTogglePlay: togglePlayback,
    onNavigate: navigate,
    onUndo: undoNow,
  });

  const delta = preview !== undefined && unitStart !== undefined ? Math.round((preview - unitStart) * 1000) : undefined;
  const total = summary.lyrics;
  const canPrev = previousLine(lyrics, active) >= 0;
  const canNext = nextLine(lyrics, active) >= 0;

  const syncLabel = !hasAudio
    ? "Open audio to sync"
    : !line
      ? "All lines done"
      : mode === "line"
        ? "Sync line"
        : word < line.tokens.length
          ? `Sync word ${word + 1}/${line.tokens.length}`
          : lineEnd === undefined
            ? "Finish line"
            : "Next line";

  const warnings = [
    summary.partial > 0 ? `${summary.partial} partly timed` : "",
    summary.orphans > 0 ? `${summary.orphans} ad-lib without a timed line` : "",
  ].filter(Boolean);

  return (
    <main className="flex flex-1 flex-col">
      {showPanel && (
        <LyricsInput
          value={text}
          timed={isTimedSource(text)}
          canCancel={lyrics.length > 0}
          onChange={setText}
          onApply={applyText}
          onCancel={() => setPanelOpen(false)}
        />
      )}

      <section className="flex min-h-64 flex-1 flex-col items-center justify-center gap-5 px-6 py-10">
        {line ? (
          <>
            <FocusLine
              entry={line}
              number={numbers[active]}
              total={total}
              mode={mode}
              word={word}
              selected={selected?.entry === active ? selected.token : -1}
              time={markerTime}
              onSelectWord={selectWord}
            />
            <p className="text-sm text-text-secondary" data-testid="focus-unit-time">
              {preview !== undefined ? (
                <>
                  Marker {formatTime(preview)}
                  {delta !== undefined && (
                    <span className="text-text-tertiary">
                      {" "}
                      ({delta >= 0 ? "+" : ""}
                      {delta} ms)
                    </span>
                  )}
                </>
              ) : atLineEnd ? (
                lineEnd !== undefined ? (
                  <>
                    Line ends at{" "}
                    <span className="font-mono tabular-nums">{formatTime(lineEnd)}</span>
                  </>
                ) : (
                  <>The line is still open — sync or press Enter to end it.</>
                )
              ) : unitStart !== undefined ? (
                <>
                  This {mode === "line" ? "line" : "word"} starts <span className="font-mono tabular-nums">{formatTime(unitStart)}</span>
                </>
              ) : (
                <>This {mode === "line" ? "line" : "word"} is not timed yet.</>
              )}
            </p>
            {!hasAudio && <p className="text-sm text-text-tertiary">Open the audio file to start syncing.</p>}
            {warnings.length > 0 && (
              <p className="text-xs text-warning">{warnings.join(" · ")}</p>
            )}
          </>
        ) : lyrics.length > 0 ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-lg font-medium text-text-primary">All lines are done.</p>
            <p className="text-sm text-text-secondary">
              {summary.wordSynced} of {total} lines word-synced. Review the timing with the arrows or the list editor.
            </p>
            <Button onClick={review}>Review from the start</Button>
          </div>
        ) : (
          <p className="max-w-md text-center text-sm text-text-tertiary">
            Paste the lyrics above, then open the track from the top bar to start syncing.
          </p>
        )}
      </section>

      <section className="border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-3">
          <div className="flex items-end justify-between gap-3 text-xs tabular-nums text-text-secondary">
            <span className="font-mono text-sm text-text-primary" data-testid="focus-marker-time">
              {formatTime(markerTime)}
            </span>
            <span className="text-text-tertiary">
              {delta !== undefined ? `${delta >= 0 ? "+" : ""}${delta} ms` : " "}
            </span>
            <span className="font-mono text-text-tertiary">{formatTime(duration)}</span>
          </div>

          <Waveform
            waveform={waveform}
            duration={duration}
            time={markerTime}
            lines={lineStarts}
            activeStart={line?.start}
            span={span}
            height={112}
            tickArea={12}
            handle
            keyboard={false}
            label="Sync position"
            onSeek={handleSeek}
            onScrubStart={handleScrubStart}
            onScrubEnd={handleScrubEnd}
            onScrubCancel={handleScrubCancel}
            className="w-full"
          />

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div role="group" aria-label="Waveform window" className="flex rounded-md border border-border p-0.5">
              {SPANS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={span === option.value}
                  title={option.title}
                  onClick={() => setSpan(option.value)}
                  className={cx(
                    "min-h-11 rounded-sm px-3 py-1 font-medium tabular-nums transition-colors sm:min-h-0 sm:px-2",
                    span === option.value ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div role="group" aria-label="Sync mode" className="flex rounded-md border border-border p-0.5">
              {MODES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={mode === option.value}
                  onClick={() => setMode(option.value)}
                  className={cx(
                    "min-h-11 rounded-sm px-3 py-1 font-medium transition-colors sm:min-h-0 sm:px-2",
                    mode === option.value ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div role="group" aria-label="Playback speed" className="flex rounded-md border border-border p-0.5">
              {PLAYBACK_RATES.map((value: PlaybackRate) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rate === value}
                  title={`Play at ${value}×. The marker stays media time, so syncs stay correct.`}
                  onClick={() => setRate(value)}
                  className={cx(
                    "min-h-11 rounded-sm px-3 py-1 font-medium tabular-nums transition-colors sm:min-h-0 sm:px-2",
                    rate === value ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {value}×
                </button>
              ))}
            </div>

            {summary.lineOnly > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11 sm:min-h-7"
                onClick={estimate}
                title="Spread each timed line's words across its span"
              >
                Estimate {summary.lineOnly}
              </Button>
            )}

            <span className="ml-auto hidden text-text-tertiary sm:inline">
              {summary.wordSynced}/{total} word-synced
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center justify-center gap-1.5 sm:justify-start">
              <Button
                size="icon"
                variant="ghost"
                className="size-11"
                title="Previous line (Up arrow)"
                aria-label="Previous line"
                disabled={!canPrev}
                onClick={() => navigate(-1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-11"
                title="Play or pause (Space)"
                aria-label={playing ? "Pause" : "Play"}
                disabled={!hasAudio}
                onClick={togglePlayback}
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-11"
                title="Next line (Down arrow)"
                aria-label="Next line"
                disabled={!canNext}
                onClick={() => navigate(1)}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-11"
                title="Undo (Backspace)"
                aria-label="Undo"
                disabled={!canUndo}
                onClick={undoNow}
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-11"
                title="Edit the lyrics text"
                aria-label="Edit the lyrics text"
                onClick={editLyrics}
              >
                <FileText className="size-4" />
              </Button>
            </div>

            <Button
              variant="primary"
              className="h-11 w-full whitespace-nowrap text-sm sm:ml-auto sm:w-auto sm:px-6"
              data-testid="focus-sync"
              disabled={!hasAudio || !line}
              title={
                atLineEnd && lineEnd !== undefined
                  ? "The line is complete; move to the next one (Enter)"
                  : "Write the marker at this time and move on (Enter)"
              }
              onClick={commitNow}
            >
              {syncLabel}
            </Button>
          </div>

          <p className="hidden text-xs leading-relaxed text-text-tertiary sm:block">
            Drag the waveform, or ←/→ to nudge 10 ms (Shift 100 ms) · Enter syncs · Space plays · ↑/↓ line · Backspace
            undoes
          </p>
        </div>
      </section>
    </main>
  );
}
