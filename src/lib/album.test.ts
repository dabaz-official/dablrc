import { describe, expect, it } from "vitest";

import { audioStem, dmllName, findTrack, formatAlbum, lyricFile, parseAlbum, withDmll } from "./album";

const ALBUM = {
  order: 14,
  title: "LOVE GOT ME NUMB",
  artist: "Playboi Carti",
  tracks: [
    { file: "love-got-me-numb.mp3", title: "LOVE GOT ME NUMB", dmll: "love-got-me-numb.dmll" },
    { file: "old.mp3", title: "Old", lrc: "old.lrc" },
    { file: "none.mp3", title: "None" },
  ],
};

const SOURCE_CRLF = `${JSON.stringify(ALBUM, null, 2).replace(/\n/g, "\r\n")}\r\n`;

describe("parseAlbum", () => {
  it("reads a manifest", () => {
    expect(parseAlbum(SOURCE_CRLF)).toMatchObject({ title: "LOVE GOT ME NUMB" });
  });

  it("rejects text that is not one", () => {
    expect(parseAlbum("{")).toBeUndefined();
    expect(parseAlbum("[]")).toBeUndefined();
    expect(parseAlbum('{"tracks":[{"title":"no file"}]}')).toBeUndefined();
  });
});

describe("track helpers", () => {
  it("strips only the last extension", () => {
    expect(audioStem("love.mp3")).toBe("love");
    expect(audioStem("track.v2.mp3")).toBe("track.v2");
    expect(audioStem("no-extension")).toBe("no-extension");
  });

  it("finds the track by its audio file name", () => {
    const album = parseAlbum(SOURCE_CRLF);
    expect(album && findTrack(album, "old.mp3")?.title).toBe("Old");
    expect(album && findTrack(album, "missing.mp3")).toBeUndefined();
  });

  it("prefers dmll over lrc and falls back to the audio name", () => {
    const album = parseAlbum(SOURCE_CRLF);
    const [first, second, third] = album!.tracks;
    expect(lyricFile(first)).toBe("love-got-me-numb.dmll");
    expect(lyricFile(second)).toBe("old.lrc");
    expect(dmllName(third)).toBe("none.dmll");
    expect(dmllName(first)).toBe("love-got-me-numb.dmll");
  });
});

describe("withDmll", () => {
  it("sets dmll and drops lrc, because the site refuses both", () => {
    const album = parseAlbum(SOURCE_CRLF)!;
    const next = withDmll(album, "old.mp3", "old.dmll");
    const track = next.tracks[1];

    expect(track).toMatchObject({ file: "old.mp3", dmll: "old.dmll" });
    expect(track.lrc).toBeUndefined();
    // Everything else is left alone.
    expect(next.title).toBe(album.title);
    expect(next.tracks[0]).toBe(album.tracks[0]);
    expect(album.tracks[1].lrc).toBe("old.lrc");
  });

  it("returns the same manifest when the track is not there", () => {
    const album = parseAlbum(SOURCE_CRLF)!;
    expect(withDmll(album, "missing.mp3", "missing.dmll")).toBe(album);
  });
});

describe("formatAlbum", () => {
  it("keeps the line endings and trailing newline of the file", () => {
    const text = formatAlbum(ALBUM, SOURCE_CRLF);
    expect(text.includes("\r\n")).toBe(true);
    expect(text.endsWith("}\r\n")).toBe(true);
    expect(text).toBe(SOURCE_CRLF);
  });

  it("writes the same shape as a hand-made manifest", () => {
    const source = `${JSON.stringify(ALBUM, null, 2)}\n`;
    expect(formatAlbum(ALBUM, source)).toBe(source);
    expect(formatAlbum(ALBUM, JSON.stringify(ALBUM))).toBe(JSON.stringify(ALBUM, null, 2));
  });
});
