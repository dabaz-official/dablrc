const pad = (value: number) => String(value).padStart(2, "0");

/** Rounds to the centisecond that DMLL is written in. */
export function roundTime(seconds: number): number {
  return Math.round(Math.max(0, seconds) * 100) / 100;
}

/** Formats seconds as `mm:ss.xx`, the timestamp shape DMLL writes. */
export function formatTime(seconds: number): string {
  const centiseconds = Math.round(Math.max(0, seconds) * 100);
  const minutes = Math.floor(centiseconds / 6000);
  const wholeSeconds = Math.floor((centiseconds % 6000) / 100);
  return `${pad(minutes)}:${pad(wholeSeconds)}.${pad(centiseconds % 100)}`;
}

/** Formats seconds as `mm:ss`, for the player's clock. */
export function formatClock(seconds: number): string {
  const whole = Math.floor(Math.max(0, seconds));
  const minutes = Math.floor(whole / 60);
  return `${pad(minutes)}:${pad(whole % 60)}`;
}
