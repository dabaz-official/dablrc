"use client";

import { useCallback, useState } from "react";

import { AlbumBar } from "./album-bar";
import { LegacyEditor } from "./legacy-editor";
import { TabsEditor } from "./tabs-editor";
import { TopBar } from "./top-bar";
import { useEditor } from "./use-editor";

export type EditorView = "tabs" | "legacy";

interface EditorShellProps {
  /** `?view=legacy` opens the list editor directly; the tab editor is the default. */
  initialView: EditorView;
}

/**
 * The one page both editors live in. The session is created here, so switching
 * from the legacy list back to the tab editor keeps the audio, the lyrics, the
 * undo history and the playhead.
 */
export function EditorShell({ initialView }: EditorShellProps) {
  const editor = useEditor();
  const [view, setView] = useState<EditorView>(initialView);

  const openTabs = useCallback(() => {
    setView("tabs");
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }, []);

  if (view === "tabs") {
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        <TabsEditor editor={editor} />
        <audio {...editor.playback.audioProps} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        audioName={editor.audioName}
        canExport={editor.lyrics.length > 0}
        onSwitchView={openTabs}
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

      <LegacyEditor editor={editor} />
      <audio {...editor.playback.audioProps} />
    </div>
  );
}
