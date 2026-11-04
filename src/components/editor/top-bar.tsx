"use client";

import { AlignCenter, Download, FileAudio, FileUp, FolderOpen } from "lucide-react";
import Image from "next/image";
import { useRef, type ChangeEvent } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const AUDIO_TYPES = "audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus";
const LYRIC_TYPES = ".dmll,.lrc,.txt";

interface TopBarProps {
  audioName?: string;
  canExport: boolean;
  onSwitchView: () => void;
  onOpenAudio: (file: File) => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onOpenAlbum: () => void;
}

export function TopBar({
  audioName,
  canExport,
  onSwitchView,
  onOpenAudio,
  onImport,
  onExport,
  onOpenAlbum,
}: TopBarProps) {
  const audioInput = useRef<HTMLInputElement>(null);
  const lyricsInput = useRef<HTMLInputElement>(null);

  function pickFile(event: ChangeEvent<HTMLInputElement>, handle: (file: File) => void) {
    const file = event.target.files?.[0];
    // Clear the input so picking the same file again still fires a change.
    event.target.value = "";
    if (file) handle(file);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <div className="flex shrink-0 items-center gap-2">
          <Image
            src="/logo/logo-dark.png"
            alt=""
            width={128}
            height={128}
            priority
            className="size-7 dark:hidden"
          />
          <Image
            src="/logo/logo-light.png"
            alt=""
            width={128}
            height={128}
            priority
            className="hidden size-7 dark:block"
          />
          {/* The wordmark is long, so it only shows where the bar has room. */}
          <span className="hidden whitespace-nowrap text-sm font-semibold text-text-primary md:inline">
            DabMusic Lyric Language Editor
          </span>
        </div>

        <p className="min-w-0 flex-1 truncate px-2 text-sm text-text-tertiary">{audioName ?? "No audio loaded"}</p>

        <Button size="sm" variant="ghost" title="Open a DabMusic album folder" onClick={onOpenAlbum}>
          <FolderOpen className="size-4" />
          <span className="hidden sm:inline">Album</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => audioInput.current?.click()}>
          <FileAudio className="size-4" />
          <span className="hidden sm:inline">Audio</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => lyricsInput.current?.click()}>
          <FileUp className="size-4" />
          <span className="hidden sm:inline">Import</span>
        </Button>
        <Button size="sm" variant="primary" disabled={!canExport} onClick={onExport} aria-label="Export .dmll">
          <Download className="size-4" />
          <span className="hidden sm:inline">Export .dmll</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          title="Open the tab editor"
          aria-label="Open the tab editor"
          onClick={onSwitchView}
        >
          <AlignCenter className="size-4" />
          <span className="hidden sm:inline">Editor</span>
        </Button>
        <ThemeToggle />

        <input
          ref={audioInput}
          type="file"
          accept={AUDIO_TYPES}
          className="hidden"
          onChange={(event) => pickFile(event, onOpenAudio)}
        />
        <input
          ref={lyricsInput}
          type="file"
          accept={LYRIC_TYPES}
          className="hidden"
          onChange={(event) => pickFile(event, onImport)}
        />
      </div>
    </header>
  );
}
