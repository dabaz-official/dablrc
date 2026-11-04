"use client";

import { useCallback, useState } from "react";

import { EditTab } from "./edit-tab";
import { EditorHeader, type EditorTab } from "./editor-header";
import { LineStepButtons } from "./line-step-buttons";
import { LineTab } from "./line-tab";
import { Player } from "./player";
import type { EditorController } from "./use-editor";
import { usePlayerKeys } from "./use-player-keys";
import { WordTab } from "./word-tab";

interface TabsEditorProps {
  editor: EditorController;
}

/**
 * The three-tab editor. The session lives in the shell, so tab changes keep the
 * audio, the lyrics and the playhead; only the local gesture preview resets.
 */
export function TabsEditor({ editor }: TabsEditorProps) {
  const [tab, setTab] = useState<EditorTab>("line");
  const { setRate, togglePlay } = editor.playback;

  const changeTab = useCallback(
    (next: EditorTab) => {
      setTab(next);
      // The 0.5× aid belongs to the Word tab; the standard player has no speed.
      setRate(1);
    },
    [setRate],
  );

  usePlayerKeys({ onTogglePlay: togglePlay, onUndo: editor.undo });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorHeader
        tab={tab}
        onTabChange={changeTab}
        audioName={editor.audioName}
        lyricsName={editor.lyricsName}
        canExport={editor.lyrics.length > 0}
        onOpenAudio={editor.openAudio}
        onImport={editor.importFile}
        onExport={editor.exportFile}
      />

      <div
        id="editor-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col"
      >
        {tab === "word" ? (
          <WordTab editor={editor} onEdit={() => changeTab("edit")} />
        ) : (
          <>
            <div className="min-h-0 flex-1">
              {tab === "edit" ? <EditTab editor={editor} /> : <LineTab editor={editor} onEdit={() => changeTab("edit")} />}
            </div>
            {tab === "line" && <LineStepButtons editor={editor} />}
            <Player playback={editor.playback} />
          </>
        )}
      </div>
    </div>
  );
}
