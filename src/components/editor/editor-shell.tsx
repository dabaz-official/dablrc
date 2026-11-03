"use client";

import { useCallback, useState } from "react";

import { AlbumBar } from "./album-bar";
import { FocusEditor } from "./focus-editor";
import { LegacyEditor } from "./legacy-editor";
import { TopBar, type EditorView } from "./top-bar";
import { useEditor } from "./use-editor";

interface EditorShellProps {
  /** `?view=legacy` opens the list editor directly; Focus is the default. */
  initialView: EditorView;
}

/**
 * The one page both editors live in. The session is created here, so switching
 * views keeps the audio, the lyrics, the undo history and the playhead.
 */
export function EditorShell({ initialView }: EditorShellProps) {
  const editor = useEditor();
  const [view, setView] = useState<EditorView>(initialView);

  const switchView = useCallback(() => {
    const next: EditorView = view === "focus" ? "legacy" : "focus";
    setView(next);

    const url = new URL(window.location.href);
    if (next === "legacy") url.searchParams.set("view", "legacy");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }, [view]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        audioName={editor.audioName}
        canExport={editor.lyrics.length > 0}
        view={view}
        onSwitchView={switchView}
        onOpenAudio={editor.openAudio}
        onImport={editor.importFile}
        onExport={editor.exportFile}
        onOpenAlbum={editor.album.connect}
      />

      <AlbumBar
        album={editor.album}
        canSave={editor.canSaveToAlbum}
        onOpen={editor.openAlbumTrack}
        onSave={editor.saveToAlbum}
      />

      {view === "focus" ? <FocusEditor editor={editor} /> : <LegacyEditor editor={editor} />}

      <audio {...editor.playback.audioProps} />
    </div>
  );
}
