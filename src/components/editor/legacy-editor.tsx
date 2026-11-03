"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { isLine } from "@/lib/dmll/model";
import { isTimedSource } from "@/lib/dmll/parse";

import { LyricList } from "./lyric-list";
import { LyricsInput } from "./lyrics-input";
import { SummaryBar } from "./summary-bar";
import { Transport } from "./transport";
import type { EditorController } from "./use-editor";
import { useSyncKeys } from "./use-sync-keys";

interface LegacyEditorProps {
  editor: EditorController;
}

/** The list-based editor, kept as it was before the Focus view existed. */
export function LegacyEditor({ editor }: LegacyEditorProps) {
  const {
    dispatch,
    lyrics,
    active,
    cursor,
    selected,
    summary,
    voices,
    playback,
    waveform,
    mode,
    setMode,
    hold,
    setHold,
    showPanel,
    setPanelOpen,
    text,
    setText,
    editing,
    applyText,
    editLyrics,
    clearAll,
    undo,
    estimate,
    toggleVoice,
    toggleAdlib,
    clearTiming,
    activate,
    selectToken,
    editToken,
    cancelEdit,
    commitToken,
    canUndo,
  } = editor;
  const { currentTime, seek, togglePlay, rate, setRate, time } = playback;

  /** The measured height of the fixed transport, reserved under the lyric list. */
  const [transportHeight, setTransportHeight] = useState(176);

  // The key handler reads the selection that was just made, not the one it was
  // created with, so F2 works on the very first key press after a click.
  const selectionRef = useRef(selected);
  useLayoutEffect(() => {
    selectionRef.current = selected;
  }, [selected]);

  const editSelected = useCallback(() => {
    if (selectionRef.current) editToken(selectionRef.current);
  }, [editToken]);

  useSyncKeys({
    dispatch,
    mode,
    hasAudio: playback.hasAudio,
    hold,
    rate,
    onRateChange: setRate,
    currentTime,
    seek,
    togglePlay,
    onEditSelected: editSelected,
  });

  const skip = useCallback((seconds: number) => seek(currentTime() + seconds), [currentTime, seek]);

  const padTap = useCallback(() => {
    dispatch({ type: "tap", time: currentTime(), mode });
  }, [dispatch, currentTime, mode]);
  const padEndWord = useCallback(() => {
    dispatch({ type: "endWord", time: currentTime() });
  }, [dispatch, currentTime]);
  const padEndLine = useCallback(() => {
    dispatch({ type: "closeLine", time: currentTime() });
  }, [dispatch, currentTime]);
  const padUndo = useCallback(() => dispatch({ type: "undo" }), [dispatch]);

  return (
    <main className="flex-1" style={{ paddingBottom: transportHeight }}>
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
          canUndo={canUndo}
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
        editing={editing}
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

      <Transport
        hasAudio={playback.hasAudio}
        playing={playback.playing}
        time={time}
        duration={playback.duration}
        waveform={waveform}
        lyrics={lyrics}
        activeStart={isLine(lyrics[active]) ? lyrics[active].start : undefined}
        mode={mode}
        rate={rate}
        hold={hold}
        canUndo={canUndo}
        onModeChange={setMode}
        onRateChange={setRate}
        onHoldChange={setHold}
        onTogglePlay={togglePlay}
        onSkip={skip}
        onSeek={seek}
        onTap={padTap}
        onEndWord={padEndWord}
        onEndLine={padEndLine}
        onUndo={padUndo}
        onHeightChange={setTransportHeight}
      />
    </main>
  );
}
