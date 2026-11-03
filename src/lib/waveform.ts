/**
 * Turns decoded samples into the peaks a waveform draws. Each peak is the
 * loudest absolute sample in its slice of the track, normalised to the track's
 * own maximum, so a quiet master still draws across the full height.
 */
export function computePeaks(samples: Float32Array, count: number): number[] {
  if (count <= 0) return [];
  const bucket = Math.floor(samples.length / count);
  if (bucket === 0) return [];

  const peaks = new Array<number>(count);
  let max = 0;

  for (let index = 0; index < count; index++) {
    const start = index * bucket;
    const end = index === count - 1 ? samples.length : start + bucket;
    let peak = 0;
    for (let i = start; i < end; i++) {
      const value = Math.abs(samples[i]);
      if (value > peak) peak = value;
    }
    peaks[index] = peak;
    if (peak > max) max = peak;
  }

  return max === 0 ? peaks.map(() => 0) : peaks.map((value) => Math.round((value / max) * 1000) / 1000);
}

/**
 * The peaks for one window of the track, grouped into `bars` values. `from` and
 * `to` are fractions of the whole track, so a zoomed window stays cheap: the
 * slice is taken from the full-resolution peaks instead of decoding again.
 */
export function peaksInRange(peaks: number[], from: number, to: number, bars: number): number[] {
  if (peaks.length === 0 || bars <= 0) return [];

  const lo = Math.min(1, Math.max(0, from)) * peaks.length;
  const hi = Math.max(lo, Math.min(1, Math.max(from, to)) * peaks.length);
  const span = hi - lo;
  const out = new Array<number>(bars);

  for (let bar = 0; bar < bars; bar++) {
    const start = Math.min(peaks.length - 1, Math.floor(lo + (span * bar) / bars));
    const end = Math.max(start + 1, Math.floor(lo + (span * (bar + 1)) / bars));
    let peak = 0;
    for (let i = start; i < end && i < peaks.length; i++) {
      if (peaks[i] > peak) peak = peaks[i];
    }
    out[bar] = peak;
  }

  return out;
}
