"use client";

import { useCallback, useMemo, useReducer, useState } from "react";

import { isLine, resolveVoices, summarize } from "@/lib/dmll/model";
import { mergeLyrics } from "@/lib/dmll/merge";
import { parseLyrics } from "@/lib/dmll/parse";
import { serializeLyrics, toLrcText } from "@/lib/dmll/serialize";
import { EMPTY_HISTORY, historyReducer, type SyncMode, type TokenRef } from "@/lib/dmll/sync";
import type { Lyrics } from "@/lib/dmll/types";

import { useAlbum } from "./use-album";
import { useDraft } from "./use-draft";
import { usePlayback } from "./use-playback";

const CONFIRM_REPLACE = "Replace the lyrics and their timing?";

/** A file name without its extension. */
const baseName = (name: string) => name.replace(/\.[^./]+$/, "");

/** Whether the lyrics still hold the token `ref` points at. */
function hasToken(lyrics: Lyrics, ref: TokenRef | undefined): ref is TokenRef {
  if (!ref) return false;
  const entry = lyrics[ref.entry];
  return isLine(entry) && ref.token < entry.tokens.length;
}

/**
 * Everything both editors share: the lyrics and their undo history, the audio,
 * its waveform, the album folder, the draft, and the actions on all of them.
 * The views only decide how to present it.
 */
export function useEditor() {
  const [history, dispatch] = useReducer(historyReducer, EMPTY_HISTORY);
  const { lyrics, active, cursor, selected } = history.present;
  const playback = usePlayback();
  const { currentTime, seek, openFile } = playback;
  const album = useAlbum();

  const [mode, setMode] = useState<SyncMode>("word");
  const [hold, setHold] = useState(false);
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

  // Undo, an import or a cleared line can remove the word being edited, so the
  // row to edit is taken from what the lyrics still hold.
  const edited = hasToken(lyrics, editing) ? editing : undefined;

  // The paste panel is open whenever there is nothing to sync yet.
  const showPanel = panelOpen || lyrics.length === 0;

  const openAudio = useCallback(
    (file: File) => {
      setAudioName(file.name);
      openFile(file);
    },
    [openFile],
  );

  /** Opens one of the album's tracks, with the lyric file it already has. */
  const openAlbumTrack = useCallback(
    async (file: string) => {
      if (lyrics.length > 0 && !window.confirm(CONFIRM_REPLACE)) return;
      const opened = await album.open(file);
      if (!opened) return;

      openAudio(opened.audio);
      setLyricsName(opened.lyricName ? baseName(opened.lyricName) : undefined);
      dispatch({ type: "replace", lyrics: opened.lyrics === undefined ? [] : parseLyrics(opened.lyrics) });
      setPanelOpen(false);
    },
    [album, lyrics.length, openAudio],
  );

  /** Writes the lyric file into the album folder and points its manifest at it. */
  const saveToAlbum = useCallback(async () => {
    const name = await album.save(serializeLyrics(lyrics));
    if (name) setLyricsName(baseName(name));
  }, [album, lyrics]);

  const canSaveToAlbum = album.track !== undefined && audioName === album.track && lyrics.length > 0;

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

  // The on-screen pad taps at the playhead, like the Space key does.
  const tap = useCallback(() => {
    dispatch({ type: "tap", time: currentTime(), mode });
  }, [currentTime, mode]);
  const endWord = useCallback(() => {
    dispatch({ type: "endWord", time: currentTime() });
  }, [currentTime]);
  const closeLine = useCallback(() => {
    dispatch({ type: "closeLine", time: currentTime() });
  }, [currentTime]);

  return {
    history,
    dispatch,
    lyrics,
    active,
    cursor,
    selected,
    summary,
    voices,
    playback,
    album,
    mode,
    setMode,
    hold,
    setHold,
    panelOpen,
    setPanelOpen,
    text,
    setText,
    audioName,
    lyricsName,
    editing: edited,
    showPanel,
    openAudio,
    openAlbumTrack,
    saveToAlbum,
    canSaveToAlbum,
    importFile,
    applyText,
    editLyrics,
    exportFile,
    clearAll,
    undo,
    estimate,
    toggleVoice,
    toggleAdlib,
    clearTiming,
    activate,
    selectToken,
    skip,
    tap,
    endWord,
    closeLine,
    editToken,
    cancelEdit,
    commitToken,
    canUndo: history.past.length > 0,
  };
}

export type EditorController = ReturnType<typeof useEditor>;
