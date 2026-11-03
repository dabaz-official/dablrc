# DabMusic Lyric Language Editor

Create and edit DMLL lyric files for DabMusic. Paste the lyrics, load the track, and put every word in time with the audio.

Two editors share one page; switching between them keeps the track, the playhead, the lyrics and the undo history.

- **Focus** (default): one line at a time, centred, with a large waveform below. Drag the waveform (or use `←`/`→` on a keyboard) until the marker sits on the line, then release to write it and move on. This is the phone-first workflow.
- **Legacy**: the full list, with inline word editing, side and ad-lib toggles, and the original key map.

The switch is in the top bar. `?view=legacy` opens the legacy editor directly.

## Focus editor

1. **Audio.** Open the track's audio file, the same file that goes into `public/music/<album>/`.
   `Album` opens one of those album folders instead: pick the track and its audio and its existing lyric file load together.
2. **Lyrics.** Paste the lyrics, one line per row. Blank rows become section breaks.
   An existing `.lrc` or `.dmll` can be pasted as it is: its timestamps are kept. `Import` opens such a file instead.
   Pasting again never throws work away: a line whose text did not change keeps the timing it already has,
   and a line that only moved is re-timed with its words.
3. **Sync.** The screen shows only the line being synced. Play the track, then set that line's timing:
   - Phone: drag the waveform. The marker follows, the audio seeks with it, and letting go writes the current word (Word mode) or the line start (Line mode) and moves on.
   - Desktop: `←` / `→` nudge the marker by 10 ms (hold `Shift` for 100 ms), and `Enter` writes it and moves on.
   - `Word` mode stamps one word per commit; when every word has a start, the next commit ends the line and moves to the next one. `Line` mode stamps the line's start.
   - `Sync` (or `Enter`) also works while the track is playing: it writes the playhead without pausing, so you can follow the song and tap each line as it starts.
   - `Space` plays or pauses, `↑` / `↓` change line, `Backspace` / `Cmd+Z` undoes, and `[` / `]` change the speed. `0.5×` and `0.75×` make fast tracks easier.
   - The waveform window is 8 s by default; `20s` and `All` are there for long gaps. A drag freezes the window under the pointer, so the target time does not move while you aim.
4. **Fix wording.** `Lyrics` opens the LRC-shaped panel, where applying an edit keeps each line's timestamp. Per-word text editing and the side/ad-lib controls are in the legacy editor.
5. **Export.** `Export .dmll` downloads the file. With an album folder open, `Save to album` writes `<track>.dmll` into it and points `album.json` at it, so only committing the folder is left.

The draft is saved in local storage under `dablrc.draft`, unchanged from earlier versions, so both editors and a reload share it. The audio itself is not stored and has to be opened again.

## Legacy editor

The list editor keeps the original workflow and keys:

1. **Sync.** Play the track and tap:
   - `Space` stamps the start of the next word, and the previous word ends there. After the last word it ends that word, so a line of one word is closed by its second tap.
   - `Shift+Space` ends the current word early, for a pause after it.
   - `Enter` ends the line and moves on to the next one.
   - `Backspace` or `Ctrl/Cmd+Z` undoes the last change.

   `Hold` turns `Space` into a press-and-release gesture. On a phone, the transport shows `Tap`, `End word`, `End line` and `Undo` buttons instead of the key hints.

   The waveform above the transport shows the track, with a tick for every timed line. Its buttons switch between an 8-second window around the playhead, 20 seconds, and the whole track. Click or drag it to seek.
2. **Fix.** Click a line or a word to select it. `S` and `E` set the selected word's start or end to the playhead. `,` `.` `;` `'` nudge the start or end by 10 ms (hold Shift for 100 ms). Arrows seek 2 s (Shift: 10 s).
   Double-click a word, or select it and press `F2`, to edit its text in place. The word keeps its timing; typing several words splits its span between them. `Enter` saves, `Esc` cancels.
3. **Shape.** `L` / `R` moves a line to the other side. `Ad-lib` turns a line into an ad-lib under the line above it.
4. **Estimate.** `Estimate` spreads each timed line's words across the time up to the next line.

The Word / Line switch in the bottom bar sets what `Space` does. In Line mode it only stamps line starts, and `Estimate` then spreads each line's words across the time up to the next line. In Word mode, words that carry a time are blue; in Line mode, lines that carry a timestamp are blue. Gray means still to do.

`Edit lyrics` shows the lyrics the way an LRC file would, timestamps included, so a wording fix keeps its line's time. Words are timed per line, so a line whose words change loses its word timing and keeps its line timestamp; a line whose text is untouched keeps everything.

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
- `src/components/editor/`: the shared session (`use-editor.ts`), the page shell and view switch (`editor-shell.tsx`), the focus editor (`focus-editor.tsx`, `focus-line.tsx`, `use-focus-keys.ts`), and the legacy list editor and transport.
- Stack: Next.js 16, React 19, Tailwind CSS 4, TypeScript, next-themes and lucide-react, with the same versions and conventions as DabMusic.
