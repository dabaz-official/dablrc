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

  // 从sessionStorage加载歌词数据和音频文件
  useEffect(() => {
    const savedLyrics = sessionStorage.getItem('dablrc-lyrics');
    if (savedLyrics) {
      try {
        const parsedLyrics = JSON.parse(savedLyrics);
        setLyrics(parsedLyrics);
      } catch (error) {
        console.error('Failed to parse saved lyrics:', error);
      }
    }

    // 从sessionStorage恢复音频文件
    const savedAudioFile = sessionStorage.getItem('dablrc-audio-file');
    if (savedAudioFile) {
      try {
        const audioData = JSON.parse(savedAudioFile);
        // 重新创建File对象和URL
        const file = new File([audioData.data], audioData.name, { type: audioData.type });
        const url = URL.createObjectURL(file);
        setAudioFile({ name: audioData.name, file, url });
      } catch (error) {
        console.error('Failed to restore audio file from sessionStorage:', error);
        sessionStorage.removeItem('dablrc-audio-file');
      }
    }
  }, []);

  // 保存歌词到sessionStorage
  const saveLyricsToStorage = (lyricsData: LyricsData) => {
    try {
      sessionStorage.setItem('dablrc-lyrics', JSON.stringify(lyricsData));
    } catch (error) {
      console.error('Failed to save lyrics to sessionStorage:', error);
    }
  };

  // 保存音频文件到sessionStorage
  const saveAudioFileToSession = async (audioFileData: AudioFile) => {
    try {
      const arrayBuffer = await audioFileData.file.arrayBuffer();
      const audioData = {
        name: audioFileData.name,
        type: audioFileData.file.type,
        data: Array.from(new Uint8Array(arrayBuffer))
      };
      sessionStorage.setItem('dablrc-audio-file', JSON.stringify(audioData));
    } catch (error) {
      console.error('Failed to save audio file to sessionStorage:', error);
    }
  };

  // 重写setAudioFile函数，添加sessionStorage保存功能
  const setAudioFileWithSave = (file: AudioFile | null) => {
    setAudioFile(file);
    if (file) {
      saveAudioFileToSession(file);
    } else {
      sessionStorage.removeItem('dablrc-audio-file');
    }
  };

  // 页面卸载时清除sessionStorage
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('dablrc-audio-file');
      sessionStorage.removeItem('dablrc-lyrics');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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
        setAudioFile: setAudioFileWithSave,
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