'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

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

  // 从localStorage加载歌词数据
  useEffect(() => {
    const savedLyrics = localStorage.getItem('dablrc-lyrics');
    if (savedLyrics) {
      try {
        const parsedLyrics = JSON.parse(savedLyrics);
        setLyrics(parsedLyrics);
      } catch (error) {
        console.error('Failed to parse saved lyrics:', error);
      }
    }
  }, []);

  // 保存歌词到localStorage
  const saveLyricsToStorage = (lyricsData: LyricsData) => {
    try {
      localStorage.setItem('dablrc-lyrics', JSON.stringify(lyricsData));
    } catch (error) {
      console.error('Failed to save lyrics to localStorage:', error);
    }
  };

  // 重写setLyrics函数，添加自动保存功能
  const setLyricsWithSave = (lyricsData: LyricsData) => {
    setLyrics(lyricsData);
    saveLyricsToStorage(lyricsData);
  };

  const updateLyricTimestamp = (lineIndex: number, timestamp: number | undefined) => {
    const updatedLyrics = {
      lines: lyrics.lines.map((line, index) => 
        index === lineIndex 
          ? { ...line, timestamp: timestamp !== undefined ? Math.round(timestamp * 100) / 100 : undefined }
          : line
      )
    };
    setLyrics(updatedLyrics);
    saveLyricsToStorage(updatedLyrics);
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
        setLyrics: setLyricsWithSave,
        updateLyricTimestamp,
        audioRef: audioRef as React.RefObject<HTMLAudioElement>,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};