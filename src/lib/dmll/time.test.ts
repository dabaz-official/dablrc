import { describe, expect, it } from "vitest";

import { formatClock, formatTime, roundTime } from "./time";

describe("formatTime", () => {
  it("writes mm:ss.xx with centiseconds", () => {
    expect(formatTime(0)).toBe("00:00.00");
    expect(formatTime(0.8)).toBe("00:00.80");
    expect(formatTime(4.09)).toBe("00:04.09");
    expect(formatTime(83.456)).toBe("01:23.46");
    expect(formatTime(3600)).toBe("60:00.00");
  });
});

describe("formatClock", () => {
  it("writes mm:ss for the player", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(61.9)).toBe("01:01");
    expect(formatClock(-3)).toBe("00:00");
    expect(formatClock(245)).toBe("04:05");
  });
});

describe("roundTime", () => {
  it("rounds to the centisecond and never goes below zero", () => {
    expect(roundTime(1.234)).toBe(1.23);
    expect(roundTime(-2)).toBe(0);
  });
});
