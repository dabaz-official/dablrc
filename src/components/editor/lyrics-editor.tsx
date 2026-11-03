"use client";

import { useCallback, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";

import { isLine, resolveVoices, summarize } from "@/lib/dmll/model";
import { mergeLyrics } from "@/lib/dmll/merge";
import { isTimedSource, parseLyrics } from "@/lib/dmll/parse";
import { serializeLyrics, toLrcText } from "@/lib/dmll/serialize";
import { EMPTY_HISTORY, historyReducer, type SyncMode, type TokenRef } from "@/lib/dmll/sync";
import type { Lyrics } from "@/lib/dmll/types";

import { LyricList } from "./lyric-list";
import { LyricsInput } from "./lyrics-input";
import { SummaryBar } from "./summary-bar";
import { TopBar } from "./top-bar";
import { Transport } from "./transport";
import { useDraft } from "./use-draft";
import { usePlayback } from "./use-playback";
import { useSyncKeys } from "./use-sync-keys";

const CONFIRM_REPLACE = "Replace the lyrics and their timing?";

/** A file name without its extension. */
const baseName = (name: string) => name.replace(/\.[^./]+$/, "");

/** Whether the lyrics still hold the token `ref` points at. */
function hasToken(lyrics: Lyrics, ref: TokenRef | undefined): ref is TokenRef {
  if (!ref) return false;
  const entry = lyrics[ref.entry];
  return isLine(entry) && ref.token < entry.tokens.length;
}

export function LyricsEditor() {
  const [history, dispatch] = useReducer(historyReducer, EMPTY_HISTORY);
  const { lyrics, active, cursor, selected } = history.present;
  const playback = usePlayback();
  const { currentTime, seek, togglePlay, openFile, rate, setRate } = playback;

  const [mode, setMode] = useState<SyncMode>("word");
  const [panelOpen, setPanelOpen] = useState(false);
  const [text, setText] = useState("");
  const [audioName, setAudioName] = useState<string>();
  const [lyricsName, setLyricsName] = useState<string>();
  /** The word whose text is being edited in place. */
  const [editing, setEditing] = useState<TokenRef>();

  const summary = useMemo(() => summarize(lyrics), [lyrics]);
  const voices = useMemo(() => resolveVoices(lyrics), [lyrics]);
  const restore = useCallback((saved: Lyrics) => dispatch({ type: "load", lyrics: saved }), []);

  useDraft(lyrics, restore);

  const editToken = useCallback((ref: TokenRef) => setEditing(ref), []);
  const cancelEdit = useCallback(() => setEditing(undefined), []);
  const commitToken = useCallback((ref: TokenRef, text: string) => {
    dispatch({ type: "setTokenText", ref, text });
    setEditing(undefined);
  }, []);
  // The key handler reads the selection that was just made, not the one it was
  // created with, so F2 works on the very first key press after a click.
  const selectionRef = useRef(selected);
  useLayoutEffect(() => {
    selectionRef.current = selected;
  }, [selected]);

  const editSelected = useCallback(() => {
    if (selectionRef.current) setEditing(selectionRef.current);
  }, []);

  // Undo, an import or a cleared line can remove the word being edited, so the
  // row to edit is taken from what the lyrics still hold.
  const edited = hasToken(lyrics, editing) ? editing : undefined;

  useSyncKeys({
    dispatch,
    mode,
    hasAudio: playback.hasAudio,
    rate,
    onRateChange: setRate,
    currentTime,
    seek,
    togglePlay,
    onEditSelected: editSelected,
  });

  // The paste panel is open whenever there is nothing to sync yet.
  const showPanel = panelOpen || lyrics.length === 0;

  const openAudio = useCallback(
    (file: File) => {
      setAudioName(file.name);
      openFile(file);
    },
    [openFile],
  );

  const importFile = useCallback(
    async (file: File) => {
      const source = await file.text();
      if (summary.timed > 0 && !window.confirm(CONFIRM_REPLACE)) return;
      dispatch({ type: "replace", lyrics: parseLyrics(source) });
      setLyricsName(baseName(file.name));
      setPanelOpen(false);
    },
    [summary.timed],
  );

  const applyText = useCallback(() => {
    // Always a merge. Pasted LRC or DMLL updates the lines, and a line whose
    // text did not change keeps the timing it already carries.
    dispatch({ type: "replace", lyrics: mergeLyrics(lyrics, parseLyrics(text)) });
    setPanelOpen(false);
  }, [text, lyrics]);

  const editLyrics = useCallback(() => {
    // Timestamps stay attached to their lines, so changing words does not move them.
    setText(toLrcText(lyrics));
    setPanelOpen(true);
  }, [lyrics]);

  const exportFile = useCallback(() => {
    const blob = new Blob([serializeLyrics(lyrics)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${lyricsName ?? (audioName ? baseName(audioName) : "lyrics")}.dmll`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [lyrics, lyricsName, audioName]);

  const clearAll = useCallback(() => {
    if (!window.confirm("Clear all lyrics and their timing?")) return;
    dispatch({ type: "replace", lyrics: [] });
    setPanelOpen(true);
  }, []);

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const estimate = useCallback(() => dispatch({ type: "estimate" }), []);
  const toggleVoice = useCallback((entry: number) => dispatch({ type: "toggleVoice", entry }), []);
  const toggleAdlib = useCallback((entry: number) => dispatch({ type: "toggleAdlib", entry }), []);
  const clearTiming = useCallback((entry: number) => dispatch({ type: "clearTiming", entry }), []);

  const activate = useCallback(
    (entry: number, start: number | undefined) => {
      dispatch({ type: "activate", entry, time: currentTime() });
      if (start !== undefined) seek(start);
    },
    [currentTime, seek],
  );

  const selectToken = useCallback(
    (ref: TokenRef, start: number | undefined) => {
      dispatch({ type: "selectToken", ref, time: currentTime() });
      if (start !== undefined) seek(start);
    },
    [currentTime, seek],
  );

  const skip = useCallback((seconds: number) => seek(currentTime() + seconds), [currentTime, seek]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        audioName={audioName}
        canExport={lyrics.length > 0}
        onOpenAudio={openAudio}
        onImport={importFile}
        onExport={exportFile}
      />

      <main className="flex-1 pb-44">
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

        {lyrics.length > 0 && (
          <SummaryBar
            summary={summary}
            hasAudio={playback.hasAudio}
            canUndo={history.past.length > 0}
            onEdit={editLyrics}
            onEstimate={estimate}
            onUndo={undo}
            onClear={clearAll}
          />
        )}

        <LyricList
          lyrics={lyrics}
          voices={voices}
          active={active}
          cursor={cursor}
          selected={selected}
          mode={mode}
          time={playback.time}
          editing={edited}
          onActivate={activate}
          onSelectToken={selectToken}
          onEditToken={editToken}
          onCommitToken={commitToken}
          onCancelEdit={cancelEdit}
          onSeek={seek}
          onToggleVoice={toggleVoice}
          onToggleAdlib={toggleAdlib}
          onClearTiming={clearTiming}
        />
      </main>

      <Transport
        hasAudio={playback.hasAudio}
        playing={playback.playing}
        time={playback.time}
        duration={playback.duration}
        mode={mode}
        rate={rate}
        onModeChange={setMode}
        onRateChange={setRate}
        onTogglePlay={togglePlay}
        onSkip={skip}
        onSeek={seek}
      />

      <audio {...playback.audioProps} />
    </div>
  );
}
