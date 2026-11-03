# DabMusic Lyric Language Editor

Create and edit DMLL lyric files for DabMusic. Paste the lyrics, load the track, and tap each word in time with the audio.

## Workflow

1. **Audio.** Open the track's audio file, the same file that goes into `public/music/<album>/`.
   `Album` opens one of those album folders instead: pick the track and its audio and its existing lyric file load together.
2. **Lyrics.** Paste the lyrics, one line per row. Blank rows become section breaks.
   An existing `.lrc` or `.dmll` can be pasted as it is: its timestamps are kept. `Import` opens such a file instead.
   Pasting again never throws work away: a line whose text did not change keeps the timing it already has,
   and a line that only moved is re-timed with its words.
3. **Sync.** Play the track and tap:
   - `Space` stamps the start of the next word, and the previous word ends there. After the last word it ends that word, so a line of one word is closed by its second tap.
   - `Shift+Space` ends the current word early, for a pause after it.
   - `Enter` ends the line and moves on to the next one.
   - `Backspace` or `Ctrl/Cmd+Z` undoes the last change.

   For rap and other fast tracks, slow the audio to `0.5×` or `0.75×` with the speed buttons or `[` `]`. The playhead is always media time, so a tap records the same timestamp it would at full speed, only twice as precisely.

   `Hold` turns `Space` into a press-and-release gesture: press at a word's start, release at its end. On a phone, the transport shows `Tap`, `End word`, `End line` and `Undo` buttons instead of the key hints.

   The waveform above the transport shows the track, with a tick for every timed line. Its buttons switch between an 8-second window around the playhead, 20 seconds, and the whole track. Click or drag it to seek.
4. **Fix.** Click a line or a word to select it. `S` and `E` set the selected word's start or end to the playhead. `,` `.` `;` `'` nudge the start or end by 10 ms (hold Shift for 100 ms). Arrows seek 2 s (Shift: 10 s).
   Double-click a word, or select it and press `F2`, to edit its text in place. The word keeps its timing; typing several words splits its span between them. `Enter` saves, `Esc` cancels.
5. **Shape.** `L` / `R` moves a line to the other side. `Ad-lib` turns a line into an ad-lib under the line above it.
6. **Export.** `Export .dmll` downloads the file. `Import` opens a `.dmll` or `.lrc` file to keep editing it.
   With an album folder open, `Save to album` writes `<track>.dmll` into it and points `album.json` at it, so only committing the folder is left. A track that listed `lrc` has that key replaced, because the site refuses a track with both; the old file stays on disk, unlisted. This uses the File System Access API (Chrome and Edge on desktop); elsewhere `Export` and `Import` still work.

The Word / Line switch in the bottom bar sets what `Space` does. In Line mode it only stamps line starts, and `Estimate` then spreads each line's words across the time up to the next line. In Word mode, words that carry a time are blue; in Line mode, lines that carry a timestamp are blue. Gray means still to do.

`Edit lyrics` shows the lyrics the way an LRC file would, timestamps included, so a wording fix keeps its line's time. Words are timed per line, so a line whose words change loses its word timing and keeps its line timestamp; a line whose text is untouched keeps everything.

Progress is kept in the browser's local storage, so a reload keeps the timing. The audio has to be opened again.

## Format

The output is DMLL, described in DabMusic's `docs/dmll-format.md`. `src/lib/dmll/parse.ts` is a port of DabMusic's `src/lib/lrc.ts`, the reader on the site.

Comments, `[ar:]`-style tags and lines with several timestamps are kept as they are. An `[offset:]` tag is preserved but not applied, which is what the site does.

## Develop

```bash
pnpm install
pnpm dev         # http://localhost:3000
pnpm test        # format, sync and merge tests
pnpm typecheck
pnpm lint
pnpm build
```

## Layout

- `src/lib/dmll/`: the format (parse, serialize, tokenize), the sync state machine, and the merge that keeps timing when lyric text is edited. Pure TypeScript with no UI.
- `src/components/editor/`: the editor page, its keyboard handling, and its audio playback.
- Stack: Next.js 16, React 19, Tailwind CSS 4, TypeScript, next-themes and lucide-react, with the same versions and conventions as DabMusic.
