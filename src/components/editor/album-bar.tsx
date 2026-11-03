"use client";

import { FolderOpen, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { AlbumController } from "./use-album";

interface AlbumBarProps {
  album: AlbumController;
  /** Whether the open audio is the selected track, so a save would go to the right file. */
  canSave: boolean;
  onOpen: (file: string) => void;
  onSave: () => void;
}

/**
 * The album folder: its tracks, which one is being edited, and the button that
 * writes the lyric file back into it.
 */
export function AlbumBar({ album, canSave, onOpen, onSave }: AlbumBarProps) {
  if (!album.connected && !album.needsPermission && !album.error) return null;

  return (
    <section className="border-b border-border bg-surface-secondary/60">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2 text-xs">
        <FolderOpen aria-hidden className="size-4 shrink-0 text-text-tertiary" />

        {album.connected ? (
          <>
            <span className="shrink-0 font-medium text-text-primary">{album.title ?? album.name}</span>
            <span className="shrink-0 text-text-tertiary">{album.tracks.length} tracks</span>

            <select
              value={album.track ?? ""}
              onChange={(event) => {
                if (event.target.value) onOpen(event.target.value);
              }}
              aria-label="Album track"
              className="min-w-0 max-w-full flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary sm:max-w-64"
            >
              <option value="">Choose a track…</option>
              {album.tracks.map((track) => (
                <option key={track.file} value={track.file}>
                  {track.title}
                  {track.lyric ? " · has lyrics" : ""}
                </option>
              ))}
            </select>

            <Button size="sm" variant="primary" disabled={!canSave} onClick={onSave} title="Write the .dmll and point album.json at it">
              <Save className="size-3.5" />
              Save to album
            </Button>
          </>
        ) : (
          <>
            <span className="shrink-0 text-text-secondary">Reconnect {album.name ?? "the album folder"}</span>
            <Button size="sm" onClick={album.reconnect}>
              Reconnect
            </Button>
          </>
        )}

        {album.saved && (
          <span className="text-success">Saved {album.saved}. Commit the album folder.</span>
        )}
        {album.error && <span className="text-danger">{album.error}</span>}
        {album.connected && !album.track && !album.error && (
          <span className="text-text-tertiary">Choose the track you are editing.</span>
        )}
      </div>
    </section>
  );
}
