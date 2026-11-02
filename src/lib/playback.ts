/**
 * Playback speeds for editing fast lyrics.
 *
 * Slowing the audio down does not change what a tap records: the playhead is
 * always media time, so the same tap is twice as precise in wall time at 0.5×.
 */
export const PLAYBACK_RATES = [0.5, 0.75, 1] as const;

export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/** The next rate up or down, stopping at the ends of the list. */
export function cycleRate(current: PlaybackRate, direction: -1 | 1): PlaybackRate {
  const index = PLAYBACK_RATES.indexOf(current);
  const next = Math.min(PLAYBACK_RATES.length - 1, Math.max(0, index + direction));
  return PLAYBACK_RATES[next];
}
