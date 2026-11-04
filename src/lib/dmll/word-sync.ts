import { roundTime } from "./time";
import type { Token } from "./types";

/** One sample of the Word tab's drag: the cursor's position and the time there. */
export interface WordSample {
  /** 0–1 across the whole line; only ever moves forward. */
  progress: number;
  /** The line's time at that position. */
  time: number;
}

export interface WordSyncOptions {
  /** Close the current word at the last sample (a pointer release). */
  finalize?: boolean;
  /** End of the line, used when the gesture reaches the last word. */
  endTime?: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const EPSILON = 1e-9;

/**
 * Where each word starts, as a fraction of the line, plus 1 for the line's end.
 *
 * The whole rail is this line, so the words divide it in proportion to their
 * text length: `boundaries[i]` is the start of word `i`, and
 * `boundaries[i + 1]` is its end. A one-word token list is `[0, 1]`.
 */
export function wordBoundaries(tokens: Token[]): number[] {
  if (tokens.length === 0) return [0];

  const weights = tokens.map((token) => Math.max(1, token.text.trim().length));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const boundaries = [0];
  let sum = 0;
  for (const weight of weights) {
    sum += weight;
    boundaries.push(sum / total);
  }
  // Avoid `0.9999999` at the right edge.
  boundaries[boundaries.length - 1] = 1;
  return boundaries;
}

/** The word whose start boundary the cursor has passed. */
export function wordIndexAt(progress: number, boundaries: number[]): number {
  const at = clamp01(progress);
  let word = 0;
  for (let index = 1; index < boundaries.length - 1; index++) {
    if (boundaries[index] <= at + EPSILON) word = index;
  }
  return word;
}

/**
 * Turns a forward drag into word timings. The caller passes tokens that already
 * hold any earlier part of the line; the samples are the pointer path, with the
 * time the rail maps that position to. As the cursor passes each word boundary,
 * the previous word ends and the next starts at the crossing time; a jump over
 * several boundaries interpolates between the two samples.
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

  const boundaries = wordBoundaries(tokens);
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
  let word = wordIndexAt(first.progress, boundaries);
  if (next[word].start === undefined) {
    next[word] = { ...next[word], start: first.time };
  }

  for (let index = 1; index < clean.length; index++) {
    const from = clean[index - 1];
    const to = clean[index];
    const reached = wordIndexAt(to.progress, boundaries);
    if (reached <= word) continue;

    const span = to.progress - from.progress;
    const duration = to.time - from.time;
    const timeAt = (progress: number) => {
      if (span <= 0) return to.time;
      const ratio = Math.min(1, Math.max(0, (progress - from.progress) / span));
      return roundTime(from.time + duration * ratio);
    };

    for (let target = word + 1; target <= reached; target++) {
      const crossing = boundaries[target];
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
