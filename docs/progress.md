# Rebuild progress

dablrc was an LRC editor: paste lines, stamp each line's start, export `.lrc`.
It is now a DMLL editor for DabMusic: paste the lyrics (plain, LRC or DMLL),
open the track, tap each word, and export the `.dmll` that sits next to the
audio in `public/music/<album>/`.

Four PRs are squash-merged into `master`. Every remote branch was kept. The old
pages, the shadcn components and the LRC-only parser are gone from `master`;
`git show 99beb77` still has them.

| PR | Commit | Branch | What landed |
| --- | --- | --- | --- |
| #1 | `a5d2803` | `dmll-editor` | The DMLL editor, start to finish |
| #2 | `975e6c6` | `slow-playback` | 0.5× / 0.75× playback |
| #3 | `5c516ea` | `fix-last-word` | Ends the last word when no word is left |
| #4 | `67f87e5` | `timed-highlight` | Timed words and lines are blue |

## Why a rewrite

The old editor parsed only `[mm:ss.xx] text`, stamped whole lines, and wrote
`.lrc`. DabMusic now reads DMLL with word-level timing (`docs/dmll-format.md`
there), and word timing is what makes the Apple-style sweep work, so line-level
editing could not produce the files the site renders.

The format rules are not guessed: `src/lib/dmll/parse.ts` is a port of
DabMusic's `src/lib/lrc.ts`, the reader the site actually runs, and
`docs/dmll-format.md` is the spec. That keeps the editor and the site agreeing
on what a file means.

## Done

### Stack

- [x] Matches DabMusic: Next 16.4.3 (App Router, `src/`, `@/*`), React 19.3.1,
      Tailwind 4.3.3 through `@tailwindcss/turbopack`, TypeScript 6.0.3, ESLint
      10 flat config with `eslint-config-next` 16.4.3, `@types/node` 24, pnpm
      12.14.0.
- [x] `pnpm-workspace.yaml` sets `allowBuilds: unrs-resolver: false`, the same
      supply-chain policy DabMusic uses; pnpm 12 refuses to install without it.
- [x] TypeScript and Tailwind are pinned to the versions in DabMusic's
      lockfile. A fresh `pnpm install` had resolved `tailwindcss` to 4.1.13
      while `@tailwindcss/turbopack` pulled 4.3.3, which would have run two
      copies of the engine.
- [x] Inter Variable vendored in `src/app/fonts/` through `next/font/local`
      (the same file and OFL licence as DabMusic); semantic colour tokens
      mirrored from its `globals.css` (light and dark), including the approved
      functional colours and the focus ring.
- [x] Tests: vitest 5.0.5, which DabMusic does not have. 46 cases in 7 files.

### Format core

Pure TypeScript in `src/lib/dmll/`, no React:

- `types.ts`: `Token`, `LyricEntry`, `AdlibEntry`, `BlankEntry`, `Lyrics`.
- `time.ts`: `mm:ss.xx` formatting and rounding to the centisecond.
- `tokenize.ts`: Latin words split on spaces with the space kept at the end,
  CJK runs one character per token, punctuation stays with the word before it.
- `parse.ts`: plain lines, line timestamps, `{start~end}` word tokens, text
  before the first token, multiple timestamps (each copy gets the words shifted
  by its offset), `[v:left|right]`, `[ad:]`, blank rows, comments, metadata, the
  legacy `>> a | b` duet form, and a byte-order mark. Anything else that looks
  like plain LRC still parses.
- `serialize.ts`: `[dmll:1]`, voice directives only where the side changes,
  word tokens only when every word of the line is timed, ad-libs as `[ad:]`
  when the line above is timed and as plain text when it is not. `toLrcText`
  writes the same lines with timestamps but without word tokens, for the edit
  box.
- `merge.ts`: keeps timing across text edits (see "Resolved decisions").
- `sync.ts`: the sync state machine, as a pure reducer with undo history.
- `model.ts`: line helpers, voice resolution, `summarize` for the status bar.

### Editor

One page, `src/app/page.tsx` to `components/editor/lyrics-editor.tsx`, with:

- Top bar: audio, import, export, theme. Import accepts `.dmll`, `.lrc`, `.txt`;
  export writes `.dmll` named after the imported file or the audio.
- Lyrics panel: paste or edit as plain text or as LRC-shaped text. Applying
  always merges, never replaces.
- Line list: one row per line, ad-libs indented, voice toggle, ad-lib toggle,
  timestamp (click to seek), per-word spans, clear-timing.
- Status bar: counts, "Estimate N lines" when line-level timing exists, Undo,
  Edit lyrics, Clear.
- Transport: play/pause, ±2 s, seek slider, Word/Line mode, speed, key hints.
- Drafts persist in `localStorage` under `dablrc.draft`; the audio does not, so
  it has to be opened again after a reload.

Keys (`event.code`, so they work on any layout): `Space` taps, `Shift+Space`
ends the current word early, `Enter` ends the line, `Backspace`/`Cmd+Z` undoes,
`P` plays, arrows seek 2 s (Shift: 10 s), `S`/`E` restamp the selected word,
`,` `.` `;` `'` nudge it 10 ms (Shift: 100 ms), `[` `]` step the speed.

### Slow playback (PR #2)

- `0.5×`, `0.75×`, `1×`, by button or `[` `]`; `src/lib/playback.ts` holds the
  list and the clamped stepping.
- The playhead is media time at any rate, so taps record the song position, not
  wall time. At `0.5×` a tap is twice as precise in wall time, which is the
  point for rap.
- Pitch is preserved, so words stay recognisable; the rate is re-applied when a
  new source loads, and changing it never moves the playhead.

### Last word (PR #3)

A tap with no next word used to do nothing, so the last word of a line, and the
only word of a one-word line, stayed open: the status bar said "partly timed"
and the export fell back to line-level timing. That tap now ends the open word;
`Enter` still ends the line and moves on. A line with nothing left to stamp
shows an `Enter ↵` hint.

### Timed highlighting (PR #4)

- Word mode: a word with a time is blue, an untimed word gray. The word being
  sung, or one that has started but not ended, also carries a pale blue wash.
- Line mode: the whole line is blue once it has a timestamp.
- Tokens in `globals.css`: `--dz-color-timed` / `--dz-color-timed-subtle`,
  light `#1d4ed8` on `#e8efff`, dark `#8ab4ff` on `#1b2a42`.
- Contrast: 6.7:1 on white, 7.9:1 on the dark page background `#1f1f1f`; both
  clear WCAG AA for normal text. The blue is distinct from the focus blue
  `#4c89ef` used for the cursor underline and the selected ring.

## Resolved decisions

- **Word timing belongs to an exact line.** Kept only while the line's text is
  identical. If the line's timestamp moved, the words move by the same delta. If
  only the wording changed, the line keeps its timestamp and loses its word
  timing; guessing word times for new words would be worse than none.
- **Matching order on paste/import.** Text first (longest common subsequence, so
  an inserted line does not shift the rest), then timestamp (so a revised LRC
  keeps its timing when only the words changed).
- **Pasting merges, importing replaces.** The panel is an edit of what is there;
  `Import` loads a file and replaces, behind a confirmation.
- **`Edit lyrics` shows timestamps.** That is why a wording fix keeps the line's
  time: the time is attached to the row the user edits.
- **A partly timed line exports line-only.** Any word missing a start or end
  makes the whole line fall back to `[mm:ss.xx] text`, per the format rules, so
  the file never carries a half-timed sweep. The status bar says so.
- **Blue means timed; gray means still to do.** Two modes, one colour language.

## Verified

- 46 vitest cases: timing, tokenizing, parsing (including the spec's quick
  reference, multi-timestamp lines, the duet form, BOM), serializing,
  round-trips, merging, the sync reducer, rate stepping.
- All 14 real `.lrc` files in DabMusic's `public/music` (564 timestamped lines,
  plain line-level, some CJK): every line's time and text survive exactly, an
  export re-parses to the same lyrics, and re-pasting the same source changes
  nothing.
- Chrome (`playwright-core` against the installed Chrome, production build):
  - tapping, voices, ad-libs, merge on text edit, reload from the draft, import
    round-trip;
  - Line mode and `Estimate`;
  - a real 72-line LRC pasted, word-tapped, edited through the LRC-shaped panel,
    then imported over;
  - slow playback: 2.44 s of wall time advanced the media by 1.12 s at `0.5×`,
    and the tap recorded `00:03.12`, the media time;
  - highlighting: computed colours match in both modes and both themes.
- Exported files were read back with a copy of DabMusic's `lrc.ts`: word times,
  gaps after an early `Shift+Space`, `[ad:]` folding into its parent line, voices
  and untimed lines all agree.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass on `master`.

## Remaining

- **The key map is my default, not the owner's.** Space/Shift+Space/Enter and
  the nudge keys have not been confirmed against how the owner actually works.
- No `.lrc` export. LRC is import-only, and the output is always DMLL.
- Repeated timestamps (`[00:12.34][00:20.00] text`) become separate lines on
  import, so they export as two lines rather than one line with two timestamps.
- `//` comments in an imported file are dropped, and `[offset:]` is ignored, as
  on the site. Files with an offset will land shifted by the same amount they do
  in DabMusic.
- No waveform, no hold-to-sing, no keyboard-driven text editing of a single
  word. The layout is desktop-first.
- The exported file is not written into DabMusic's album folder automatically;
  the owner places it and adds `dmll` to `album.json`.
- `next build` warns that `metadataBase` is unset, because the old
  `opengraph-image.jpg` is still in `src/app/`. It needs a real site URL before
  that warning goes away.
- The site name is still DabLRC.

## Working notes

- **Ports.** DabMusic's `next dev` normally holds 3000, so dablrc lands on 3001.
  Verification runs used `next start` on 3123. Do not kill the 3000 process
  unless asked.
- **`next dev` rewrites `tsconfig.json`** (`jsx`, `.next/dev/types/**/*.ts`,
  reformatted arrays). Discard that change before switching branches instead of
  committing it.
- **Browser colour assertions need transitions disabled.** `transition-colors`
  makes `getComputedStyle` return an in-between value; inject
  `* { transition: none !important; }` first. The tertiary gray differs per
  theme (`#737373` light, `#a3a3a3` dark).
- **Partially timed lines are correct, not a bug.** The export rule above has
  caught two test expectations already.
- **The verification loop that has caught real problems:** vitest, then
  `typecheck`/`lint`/`build`, then Chrome against a production build, then the
  exported file through DabMusic's own parser. The browser scripts live in
  `/tmp/dablrc-e2e` and are not committed.
