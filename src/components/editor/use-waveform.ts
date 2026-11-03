"use client";

import { useEffect, useState } from "react";

import { computePeaks } from "@/lib/waveform";

/** Peaks kept for the whole track; a window groups them into 2–3 px bars. */
const PEAK_COUNT = 12000;
/** The envelope only needs a low sample rate, not the decoded track's own. */
const SAMPLE_RATE = 8000;

interface Decoded {
  file: File;
  peaks?: number[];
  failed?: boolean;
}

export interface WaveformState {
  /** The track's peaks, once decoded. */
  peaks?: number[];
  /** True while the file is being decoded. */
  loading: boolean;
  /** True when the file could not be decoded; the waveform falls back to a line. */
  failed: boolean;
}

/** Decodes `file` off the playback path, as mono, and reduces it to peaks. */
async function decodePeaks(file: File): Promise<number[]> {
  const bytes = await file.arrayBuffer();
  let context: AudioContext;
  try {
    context = new AudioContext({ sampleRate: SAMPLE_RATE });
  } catch {
    // Some browsers refuse an unusual rate; the default rate still works.
    context = new AudioContext();
  }

  try {
    const buffer = await context.decodeAudioData(bytes);
    const mono = new Float32Array(buffer.length);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) mono[i] += samples[i] / buffer.numberOfChannels;
    }
    return computePeaks(mono, PEAK_COUNT);
  } finally {
    void context.close();
  }
}

/**
 * The peaks of the open audio file. Decoding happens in a separate
 * `AudioContext`, so it never touches the `<audio>` element's playback, time or
 * rate, and a failed decode only costs the picture, not the sound.
 */
export function useWaveform(file: File | undefined): WaveformState {
  const [decoded, setDecoded] = useState<Decoded>();

  useEffect(() => {
    if (!file) return;
    let cancelled = false;

    decodePeaks(file)
      .then((peaks) => {
        if (!cancelled) setDecoded({ file, peaks });
      })
      .catch(() => {
        if (!cancelled) setDecoded({ file, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!file) return { loading: false, failed: false };
  if (decoded?.file !== file) return { loading: true, failed: false };
  if (decoded.failed) return { loading: false, failed: true };
  return { loading: false, failed: false, peaks: decoded.peaks };
}
