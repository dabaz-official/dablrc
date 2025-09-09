'use client';

import React, { createContext, useContext, useState, useRef } from 'react';

interface AudioFile {
  name: string;
  file: File;
  url: string;
}

interface LyricLine {
  text: string;
  timestamp?: number; // 时间戳，精确到小数点后两位
}

interface LyricsData {
  lines: LyricLine[];
}

interface AudioContextType {
  audioFile: AudioFile | null;
  setAudioFile: (file: AudioFile | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  lyrics: LyricsData;
  setLyrics: (lyrics: LyricsData) => void;
  updateLyricTimestamp: (lineIndex: number, timestamp: number | undefined) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState<LyricsData>({ lines: [] });
  const audioRef = useRef<HTMLAudioElement>(null);

  const updateLyricTimestamp = (lineIndex: number, timestamp: number | undefined) => {
    setLyrics(prev => ({
      lines: prev.lines.map((line, index) => 
        index === lineIndex 
          ? { ...line, timestamp: timestamp !== undefined ? Math.round(timestamp * 100) / 100 : undefined }
          : line
      )
    }));
  };

  return (
    <AudioContext.Provider
      value={{
        audioFile,
        setAudioFile,
        isPlaying,
        setIsPlaying,
        currentTime,
        setCurrentTime,
        duration,
        setDuration,
        lyrics,
        setLyrics,
        updateLyricTimestamp,
        audioRef: audioRef as React.RefObject<HTMLAudioElement>,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};