"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  dmllName,
  findTrack,
  formatAlbum,
  lyricFile,
  parseAlbum,
  withDmll,
  type Album,
} from "@/lib/album";

/** The picker remembers the last folder per `id`, so reconnecting opens there. */
const PICKER_ID = "dablrc-album";
const DB_NAME = "dablrc";
const STORE = "handles";
const KEY = "album";

type Picker = (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;

/** `queryPermission`/`requestPermission` are not in every TypeScript DOM lib yet. */
type Permissioned = FileSystemDirectoryHandle & {
  queryPermission?(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
};

interface Connected {
  handle: FileSystemDirectoryHandle;
  /** The manifest as it was read, for its line endings. */
  source: string;
  album: Album;
}

export interface AlbumTrackInfo {
  file: string;
  title: string;
  /** The lyric file the manifest already lists, if any. */
  lyric?: string;
}

export interface OpenedTrack {
  audio: File;
  lyrics?: string;
  lyricName?: string;
}

export interface AlbumController {
  connected: boolean;
  /** A folder from an earlier visit that needs one click to re-allow. */
  needsPermission: boolean;
  /** The folder's name. */
  name?: string;
  /** The album's title from its manifest. */
  title?: string;
  tracks: AlbumTrackInfo[];
  /** The audio file of the track being edited, when it came from the folder. */
  track?: string;
  error?: string;
  /** The lyric file written by the last save. */
  saved?: string;
  connect: () => Promise<void>;
  reconnect: () => Promise<void>;
  open: (file: string) => Promise<OpenedTrack | undefined>;
  save: (text: string) => Promise<string | undefined>;
}

function describe(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "AbortError") return "";
    if (error.name === "NotFoundError") return "album.json or a track file is missing from that folder.";
    if (error.name === "NotAllowedError") return "The browser did not allow access to that folder.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function readAlbum(handle: FileSystemDirectoryHandle): Promise<Connected> {
  const file = await (await handle.getFileHandle("album.json")).getFile();
  const source = await file.text();
  const album = parseAlbum(source);
  if (!album) throw new Error("album.json is not a manifest this editor understands.");
  return { handle, source, album };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Remembers the folder so the next visit only needs a permission click. */
async function rememberHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(handle, KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch {
    // Remembering is a nicety; the picker still works without it.
  }
}

async function recallHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    const db = await openDb();
    const handle = await new Promise<FileSystemDirectoryHandle | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result as FileSystemDirectoryHandle | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return handle;
  } catch {
    return undefined;
  }
}

/**
 * A DabMusic album folder: its manifest, its tracks, and the lyric file that
 * belongs to each. Writes go straight into the folder, so the owner only has to
 * commit it afterwards.
 */
export function useAlbum(): AlbumController {
  const [connected, setConnected] = useState<Connected>();
  const [restored, setRestored] = useState<FileSystemDirectoryHandle>();
  const [needsPermission, setNeedsPermission] = useState(false);
  const [track, setTrack] = useState<string>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();

  const apply = useCallback((next: Connected) => {    setConnected(next);
    setTrack(undefined);
    setSaved(undefined);
    setError(undefined);
  }, []);

  // A folder from an earlier visit: use it if the browser still allows it,
  // otherwise offer one click to re-allow it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const handle = await recallHandle();
      if (!handle || cancelled) return;

      const permission = await (handle as Permissioned).queryPermission?.({ mode: "readwrite" });
      if (permission === "granted") {
        try {
          const next = await readAlbum(handle);
          if (!cancelled) apply(next);
          return;
        } catch {
          // Fall through to the reconnect prompt.
        }
      }
      if (!cancelled) {
        setRestored(handle);
        setNeedsPermission(true);
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const connect = useCallback(async () => {
    const picker = (window as Window & { showDirectoryPicker?: Picker }).showDirectoryPicker;
    if (!picker) {
      setError("This browser cannot open a folder. Use Audio and Import instead, or open the page in Chrome or Edge.");
      return;
    }
    try {
      setError(undefined);
      const handle = await picker({ id: PICKER_ID, mode: "readwrite" });
      const next = await readAlbum(handle);
      apply(next);
      setRestored(undefined);
      setNeedsPermission(false);
      void rememberHandle(handle);
    } catch (failure) {
      const message = describe(failure);
      if (message) setError(message);
    }
  }, [apply]);

  const reconnect = useCallback(async () => {
    if (!restored) return;
    try {
      setError(undefined);
      const permission = await (restored as Permissioned).requestPermission?.({ mode: "readwrite" });
      if (permission !== "granted") return;
      const next = await readAlbum(restored);
      apply(next);
      setRestored(undefined);
      setNeedsPermission(false);
    } catch (failure) {
      setError(describe(failure));
    }
  }, [apply, restored]);

  const open = useCallback(
    async (file: string): Promise<OpenedTrack | undefined> => {
      if (!connected) return undefined;
      try {
        setError(undefined);
        const audio = await (await connected.handle.getFileHandle(file)).getFile();

        const entry = findTrack(connected.album, file);
        const lyricName = entry ? lyricFile(entry) : undefined;
        let lyrics: string | undefined;
        if (lyricName) {
          try {
            lyrics = await (await connected.handle.getFileHandle(lyricName)).getFile().then((item) => item.text());
          } catch {
            // The manifest points at a file that is no longer there; start empty.
            lyrics = undefined;
          }
        }

        setTrack(file);
        setSaved(undefined);
        return { audio, lyrics, lyricName };
      } catch (failure) {
        setError(describe(failure) || "Could not open that track.");
        return undefined;
      }
    },
    [connected],
  );

  const save = useCallback(
    async (text: string): Promise<string | undefined> => {
      if (!connected || !track) return undefined;
      const entry = findTrack(connected.album, track);
      if (!entry) {
        setError("That track is not in the album manifest.");
        return undefined;
      }

      try {
        setError(undefined);
        const name = dmllName(entry);
        const lyric = await connected.handle.getFileHandle(name, { create: true });
        const lyricStream = await lyric.createWritable();
        await lyricStream.write(text);
        await lyricStream.close();

        const album = withDmll(connected.album, track, name);
        const source = formatAlbum(album, connected.source);
        const manifest = await connected.handle.getFileHandle("album.json");
        const manifestStream = await manifest.createWritable();
        await manifestStream.write(source);
        await manifestStream.close();

        setConnected({ handle: connected.handle, source, album });
        setSaved(name);
        return name;
      } catch (failure) {
        setError(describe(failure) || "Could not write to the album folder.");
        return undefined;
      }
    },
    [connected, track],
  );

  const tracks = useMemo(
    () =>
      connected
        ? connected.album.tracks.map((entry) => ({
            file: entry.file,
            title: entry.title ?? entry.file,
            lyric: lyricFile(entry),
          }))
        : [],
    [connected],
  );

  return {
    connected: connected !== undefined,
    needsPermission,
    name: connected?.handle.name ?? restored?.name,
    title: connected?.album.title,
    tracks,
    track,
    error,
    saved,
    connect,
    reconnect,
    open,
    save,
  };
}
