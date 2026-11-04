import { roundTime } from "./time";
import type { Token } from "./types";

/** One sample of the Word tab's drag: the pill's position and the clock there. */
export interface WordSample {
  /** 0–1 across the words; only ever moves forward. */
  progress: number;
  /** Media time at that point. */
  time: number;
}

export interface WordSyncOptions {
  /** Close the current word at the last sample (a pointer release). */
  finalize?: boolean;
  /** End of the line, used when the gesture reaches the last word. */
  endTime?: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** The word slot the pill covers at `progress`; the pill's leading edge enters it. */
export function wordIndexAt(progress: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.floor(clamp01(progress) * (count - 1) + 1e-9));
}

/**
 * Turns a forward drag into word timings. The caller passes tokens that already
 * hold any earlier part of the line; the samples are the pointer path, with the
 * media time at each point. Every slot the pill enters starts that word at the
 * time the pill got there, and the previous word ends there. A jump over
 * several slots interpolates between the two samples, so no word gets a zero
 * duration just because the pointer moved fast.
 *
 * Progress and time are clamped so a leftward or rewound sample can never move
 * the timing backwards.
 */
export function syncWordTimings(
  tokens: Token[],
  samples: WordSample[],
  options: WordSyncOptions = {},
): Token[] {
  if (tokens.length === 0 || samples.length === 0) return tokens;

  const count = tokens.length;
  const next = tokens.map((token) => ({ ...token }));

  // Clamp the samples in order, so the rest of the function can be linear.
  const clean: WordSample[] = [];
  let previous: WordSample | undefined;
  for (const sample of samples) {
    const progress = clamp01(previous ? Math.max(previous.progress, sample.progress) : sample.progress);
    const time = previous ? Math.max(previous.time, sample.time) : Math.max(0, sample.time);
    const at = { progress, time: roundTime(time) };
    clean.push(at);
    previous = at;
  }

  const first = clean[0];
  let word = wordIndexAt(first.progress, count);
  if (next[word].start === undefined) {
    next[word] = { ...next[word], start: first.time };
  }

  for (let index = 1; index < clean.length; index++) {
    const from = clean[index - 1];
    const to = clean[index];
    const reached = wordIndexAt(to.progress, count);
    if (reached <= word) continue;

    const span = to.progress - from.progress;
    const duration = to.time - from.time;
    const timeAt = (progress: number) => {
      if (span <= 0) return to.time;
      const ratio = Math.min(1, Math.max(0, (progress - from.progress) / span));
      return roundTime(from.time + duration * ratio);
    };

    for (let target = word + 1; target <= reached; target++) {
      const crossing = count <= 1 ? 1 : target / (count - 1);
      let at = timeAt(crossing);
      const start = next[target - 1].start;
      if (start !== undefined) at = Math.max(at, start);

      next[target - 1] = { ...next[target - 1], end: at };
      next[target] = { ...next[target], start: at };
    }
    word = reached;
  }

  if (options.finalize) {
    const last = clean[clean.length - 1];
    const start = next[word].start ?? 0;
    const at = options.endTime === undefined ? last.time : roundTime(options.endTime);
    next[word] = { ...next[word], end: roundTime(Math.max(start, at)) };
  }

  return next;
}
