"use client";

import { Download, FileAudio, FileUp } from "lucide-react";
import Image from "next/image";
import { useRef, type ChangeEvent, type KeyboardEvent } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";

const AUDIO_TYPES = "audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus";
const LYRIC_TYPES = ".dmll,.lrc,.txt";

export type EditorTab = "edit" | "line" | "word";

const TABS: Array<{ value: EditorTab; label: string }> = [
  { value: "edit", label: "Edit" },
  { value: "line", label: "Line" },
  { value: "word", label: "Word" },
];

/** A file name without its extension. */
const baseName = (name: string) => name.replace(/\.[^./]+$/, "");

interface EditorHeaderProps {
  tab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  audioName?: string;
  lyricsName?: string;
  canExport: boolean;
  onOpenAudio: (file: File) => void;
  onImport: (file: File) => void;
  onExport: () => void;
}

export function EditorHeader({
  tab,
  onTabChange,
  audioName,
  lyricsName,
  canExport,
  onOpenAudio,
  onImport,
  onExport,
}: EditorHeaderProps) {
  const audioInput = useRef<HTMLInputElement>(null);
  const lyricsInput = useRef<HTMLInputElement>(null);

  const title = audioName ? baseName(audioName) : lyricsName ? baseName(lyricsName) : "Untitled lyrics";
  const subtitle = audioName ?? (lyricsName ? `${lyricsName}.dmll` : "No audio loaded");

  function pickFile(event: ChangeEvent<HTMLInputElement>, handle: (file: File) => void) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) handle(file);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((item) => item.value === tab);
    let next: number;
    if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;

    event.preventDefault();
    const value = TABS[next].value;
    onTabChange(value);
    document.getElementById(`tab-${value}`)?.focus();
  }

  return (
    <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Image src="/logo/logo-dark.png" alt="" width={128} height={128} priority className="size-8 shrink-0 dark:hidden" />
          <Image
            src="/logo/logo-light.png"
            alt=""
            width={128}
            height={128}
            priority
            className="hidden size-8 shrink-0 dark:block"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{title}</p>
            <p className="hidden truncate text-xs text-text-tertiary sm:block">{subtitle}</p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Editor view"
          onKeyDown={onTabKeyDown}
          className="col-span-2 row-start-2 flex w-full max-w-md rounded-lg border border-border bg-surface-secondary p-0.5 md:col-span-1 md:col-start-2 md:row-start-1 md:w-auto md:justify-self-center"
        >
          {TABS.map((item) => (
            <button
              key={item.value}
              id={`tab-${item.value}`}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              aria-controls="editor-panel"
              tabIndex={tab === item.value ? 0 : -1}
              onClick={() => onTabChange(item.value)}
              className={cx(
                "min-h-11 flex-1 rounded-md px-4 text-sm font-medium transition-colors md:min-h-0 md:py-1.5",
                tab === item.value
                  ? "bg-primary text-on-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="col-start-2 row-start-1 flex items-center gap-1 justify-self-end md:col-start-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-11 gap-1.5 px-2.5"
            title="Open an audio file"
            aria-label="Open an audio file"
            onClick={() => audioInput.current?.click()}
          >
            <FileAudio className="size-4" />
            <span className="hidden md:inline">Audio</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-11 gap-1.5 px-2.5"
            title="Upload a .dmll lyric file"
            aria-label="Upload a .dmll lyric file"
            onClick={() => lyricsInput.current?.click()}
          >
            <FileUp className="size-4" />
            <span className="hidden md:inline">Lyrics</span>
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="h-11 gap-1.5 px-3"
            title="Download the .dmll file"
            aria-label="Export .dmll"
            disabled={!canExport}
            onClick={onExport}
          >
            <Download className="size-4" />
            <span className="hidden md:inline">Export</span>
          </Button>
          <ThemeToggle className="min-h-11 min-w-11" />
        </div>

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
