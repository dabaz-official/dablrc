import { describe, expect, it } from "vitest";

import { computePeaks, peaksInRange } from "./waveform";

/** Four samples per bucket, so the expected peaks are easy to read. */
const samples = new Float32Array([0, 0.5, -0.25, 0.1, 0.8, -0.2, 0, 0, 0.2, 0.1, -0.3, 0.05]);

describe("computePeaks", () => {
  it("takes the loudest absolute sample of each slice", () => {
    expect(computePeaks(samples, 3)).toEqual([0.625, 1, 0.375]);
  });

  it("normalises to the track's own maximum", () => {
    const quiet = new Float32Array([0.1, 0.05, 0.2, 0.15]);
    expect(computePeaks(quiet, 2)).toEqual([0.5, 1]);
  });

  it("gives the last slice the rest of the samples", () => {
    expect(computePeaks(new Float32Array([0, 0, 0, 0, 1]), 2)).toEqual([0, 1]);
  });

  it("returns nothing when there are fewer samples than peaks", () => {
    expect(computePeaks(new Float32Array([1, 2]), 3)).toEqual([]);
    expect(computePeaks(samples, 0)).toEqual([]);
  });

  it("returns silence for a silent track instead of dividing by zero", () => {
    expect(computePeaks(new Float32Array(8), 2)).toEqual([0, 0]);
  });
});

describe("peaksInRange", () => {
  const peaks = [0, 0.2, 0.4, 0.6, 0.8, 1, 0.5, 0];

  it("keeps the loudest peak of each bar in the window", () => {
    expect(peaksInRange(peaks, 0, 1, 4)).toEqual([0.2, 0.6, 1, 0.5]);
  });

  it("takes the window from the middle of the track", () => {
    expect(peaksInRange(peaks, 0.5, 1, 2)).toEqual([1, 0.5]);
  });

  it("clamps a window that runs past the end", () => {
    expect(peaksInRange(peaks, 0.75, 2, 2)).toEqual([0.5, 0]);
  });

  it("returns nothing for empty input", () => {
    expect(peaksInRange([], 0, 1, 4)).toEqual([]);
    expect(peaksInRange(peaks, 0, 1, 0)).toEqual([]);
  });
});
