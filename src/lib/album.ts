/** The album.json fields the editor reads and writes. Other fields are kept as they are. */
export interface AlbumTrack {
  file: string;
  title?: string;
  dmll?: string;
  lrc?: string;
  [key: string]: unknown;
}

export interface Album {
  title?: string;
  artist?: string;
  tracks: AlbumTrack[];
  [key: string]: unknown;
}

/** A file name without its last extension. */
export function audioStem(file: string): string {
  const dot = file.lastIndexOf(".");
  return dot > 0 ? file.slice(0, dot) : file;
}

/**
 * The manifest, or undefined when the text is not one. Only `tracks[].file` is
 * required; everything else is DabMusic's business and is left alone.
 */
export function parseAlbum(source: string): Album | undefined {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;

  const tracks = (value as { tracks?: unknown }).tracks;
  if (!Array.isArray(tracks)) return undefined;
  const valid = tracks.every(
    (track) => typeof track === "object" && track !== null && typeof (track as { file?: unknown }).file === "string",
  );
  return valid ? (value as Album) : undefined;
}

/** The track whose audio file is `file`. */
export function findTrack(album: Album, file: string): AlbumTrack | undefined {
  return album.tracks.find((track) => track.file === file);
}

/** The lyric file a track already points at. */
export function lyricFile(track: AlbumTrack): string | undefined {
  return track.dmll ?? track.lrc;
}

/**
 * The name a saved lyric file should have: the one the manifest already lists,
 * or the audio file's name with `.dmll`.
 */
export function dmllName(track: AlbumTrack): string {
  return track.dmll ?? `${audioStem(track.file)}.dmll`;
}

/**
 * Points `file`'s track at `dmll`. `lrc` is dropped in the same step, because
 * the site refuses a track that lists both.
 */
export function withDmll(album: Album, file: string, dmll: string): Album {
  let changed = false;
  const tracks = album.tracks.map((track) => {
    if (track.file !== file) return track;
    changed = true;
    const next = { ...track, dmll };
    delete next.lrc;
    return next;
  });
  return changed ? { ...album, tracks } : album;
}

/**
 * The manifest as text: two-space JSON, with the line endings and trailing
 * newline the file already used, so a save shows up as a one-line diff.
 */
export function formatAlbum(album: Album, like: string): string {
  const eol = like.includes("\r\n") ? "\r\n" : "\n";
  const json = JSON.stringify(album, null, 2).split("\n").join(eol);
  return /\r?\n$/.test(like) ? `${json}${eol}` : json;
}
