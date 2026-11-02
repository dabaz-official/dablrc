"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";

/** Owns the `<audio>` element and the playhead the editor reads from it. */
export function usePlayback() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | undefined>(undefined);
  const [src, setSrc] = useState<string>();
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  // While playing, read the clock every frame. The audio events cover pauses and seeks.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      setTime(audioRef.current?.currentTime ?? 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const openFile = useCallback((file: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    setSrc(urlRef.current);
    setTime(0);
    setDuration(0);
  }, []);

  const currentTime = useCallback(() => audioRef.current?.currentTime ?? 0, []);

  const seek = useCallback((to: number) => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    const next = Math.min(Math.max(0, to), limit);
    audio.currentTime = next;
    setTime(next);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    if (audio.paused) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, []);

  return {
    hasAudio: src !== undefined,
    time,
    duration,
    playing,
    currentTime,
    seek,
    togglePlay,
    openFile,
    audioProps: {
      ref: audioRef,
      src,
      preload: "auto" as const,
      onLoadedMetadata: (event: SyntheticEvent<HTMLAudioElement>) => setDuration(event.currentTarget.duration),
      onTimeUpdate: (event: SyntheticEvent<HTMLAudioElement>) => setTime(event.currentTarget.currentTime),
      onPlay: () => setPlaying(true),
      onPause: (event: SyntheticEvent<HTMLAudioElement>) => {
        setPlaying(false);
        setTime(event.currentTarget.currentTime);
      },
      onEnded: () => setPlaying(false),
    },
  };
}
