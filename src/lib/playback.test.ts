import { describe, expect, it } from "vitest";

import { PLAYBACK_RATES, cycleRate } from "./playback";

describe("cycleRate", () => {
  it("steps through the rates and stops at the ends", () => {
    expect(cycleRate(1, -1)).toBe(0.75);
    expect(cycleRate(0.75, -1)).toBe(0.5);
    expect(cycleRate(0.5, -1)).toBe(0.5);
    expect(cycleRate(0.5, 1)).toBe(0.75);
    expect(cycleRate(0.75, 1)).toBe(1);
    expect(cycleRate(1, 1)).toBe(1);
  });

  it("starts at normal speed and lists the slowest first", () => {
    expect(PLAYBACK_RATES).toEqual([0.5, 0.75, 1]);
  });
});
