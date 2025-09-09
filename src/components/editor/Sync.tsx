'use client';

import React, { useState } from 'react';
import { Play, Pause, ChevronDown, ChevronUp, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/contexts/AudioContext';

const Sync: React.FC = () => {
  const {
    audioFile,
    isPlaying,
    setIsPlaying,
    currentTime,
    lyrics,
    updateLyricTimestamp,
    audioRef,
  } = useAudio();
  
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  // 根据当前播放时间计算应该高亮的歌词行
  const getActiveLineIndex = () => {
    if (!lyrics.lines.length) return -1;
    
    let activeIndex = -1;
    for (let i = 0; i < lyrics.lines.length; i++) {
      const line = lyrics.lines[i];
      if (line.timestamp === undefined) continue;
      
      // 如果当前时间大于等于这行的时间戳
      if (currentTime >= line.timestamp) {
        // 检查下一行是否存在且有时间戳
        const nextLine = lyrics.lines[i + 1];
        if (nextLine && nextLine.timestamp !== undefined) {
          // 如果当前时间小于下一行的时间戳，则当前行应该高亮
          if (currentTime < nextLine.timestamp) {
            activeIndex = i;
            break;
          }
        } else {
          // 如果没有下一行或下一行没有时间戳，则当前行应该高亮
          activeIndex = i;
        }
      }
    }
    return activeIndex;
  };

  const activeLineIndex = getActiveLineIndex();

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextLine = () => {
    if (currentLineIndex < lyrics.lines.length) {
      updateLyricTimestamp(currentLineIndex, currentTime);
      setCurrentLineIndex(prev => prev + 1);
    }
  };

  const handleLyricClick = (lineIndex: number, timestamp: number | undefined) => {
    if (timestamp !== undefined && audioRef.current) {
      audioRef.current.currentTime = timestamp;
      setCurrentLineIndex(lineIndex);
    }
  };

  const adjustTimestamp = (lineIndex: number, adjustment: number) => {
    const line = lyrics.lines[lineIndex];
    if (line.timestamp !== undefined) {
      const newTimestamp = Math.max(0, line.timestamp + adjustment);
      updateLyricTimestamp(lineIndex, newTimestamp);
      
      // 同时更新播放器的当前播放时间
      if (audioRef.current) {
        audioRef.current.currentTime = newTimestamp;
      }
    }
  };

  const clearTimestamp = (lineIndex: number) => {
    updateLyricTimestamp(lineIndex, undefined);
  };

  const goToStart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentLineIndex(0);
    }
  };

  const setEndTimestamp = () => {
    // 在歌词数据中添加一个特殊的结束标记
    // 这里我们可以在AudioContext中添加一个endTimestamp状态
    // 暂时先设置为当前时间
    console.log('Set end timestamp:', currentTime);
  };

  const handlePrevLine = () => {
    if (currentLineIndex > 0) {
      const prevIndex = currentLineIndex - 1;
      updateLyricTimestamp(prevIndex, undefined); // 重置时间戳为无
      setCurrentLineIndex(prevIndex);
    }
  };

  const formatTime = (time?: number) => {
    if (time === undefined) return '--:--';
    const minutes = Math.floor(time / 60);
    const seconds = (time % 60).toFixed(2);
    return `${minutes.toString().padStart(2, '0')}:${seconds.padStart(5, '0')}`;
  };

  if (!audioFile) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2 text-neutral-800 dark:text-neutral-200">
            Timeline Sync
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Synchronize lyrics with audio timeline
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="p-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-center">
            <p className="text-neutral-500 dark:text-neutral-400">
              Please upload an audio file first
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (lyrics.lines.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2 text-neutral-800 dark:text-neutral-200">
            Timeline Sync
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Synchronize lyrics with audio timeline
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="p-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-center">
            <p className="text-neutral-500 dark:text-neutral-400">
              Please add lyrics in the Edit page first
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-neutral-800 dark:text-neutral-200">
          Timeline Sync
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Click play and use the next button to sync lyrics with audio
        </p>
      </div>

      {/* 播放控制按钮 */}
      <div className="mb-6 flex justify-center gap-4">
        <button
          onClick={handlePrevLine}
          disabled={currentLineIndex <= 0}
          className="flex items-center justify-center w-12 h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-colors"
        >
          <ChevronUp size={24} />
        </button>
        
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        
        <button
          onClick={handleNextLine}
          disabled={currentLineIndex >= lyrics.lines.length}
          className="flex items-center justify-center w-12 h-12 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-colors"
        >
          <ChevronDown size={24} />
        </button>
      </div>

      {/* 当前播放时间显示 */}
      <div className="mb-6 text-center">
        <p className="text-lg font-mono text-neutral-700 dark:text-neutral-300">
          Current Time: {formatTime(currentTime)}
        </p>
      </div>

      {/* 歌词列表 */}
      <div className="space-y-2">
          {/* Start 按钮 */}
          <div className="flex items-center py-2 px-1 border-b border-neutral-100 dark:border-neutral-800">
            <div className="w-64 flex items-center gap-1 pr-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-sm"
                onClick={goToStart}
              >
                Start
              </Button>
            </div>
            <div className="flex-1 text-left text-neutral-500 dark:text-neutral-400 italic">
              
            </div>
          </div>
          
          {lyrics.lines.map((line, index) => (
          <div
            key={index}
            className={`flex items-center py-2 px-1 dark:border-neutral-800 ${
              index === currentLineIndex
                ? 'bg-blue-50/50 dark:bg-blue-900/10'
                : index === activeLineIndex
                ? 'bg-green-50/50 dark:bg-green-900/10'
                : ''
            } ${
              line.timestamp !== undefined ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : ''
            }`}
            onClick={() => handleLyricClick(index, line.timestamp)}
            onMouseLeave={() => {
              // 鼠标离开时清除蓝色高亮
              if (index === currentLineIndex) {
                setCurrentLineIndex(-1);
              }
            }}
          >
            {/* 左侧：时间戳和控制按钮 */}
              <div className="w-64 flex items-center gap-1 pr-4">
                {/* X 按钮 - 清除时间戳 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearTimestamp(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
                
                {line.timestamp !== undefined && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustTimestamp(index, -0.25);
                      }}
                    >
                      <ChevronsLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustTimestamp(index, -0.1);
                      }}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                  </>
                )}
                
                <div className="w-20 text-sm font-mono text-neutral-500 dark:text-neutral-400 text-center">
                  {line.timestamp !== undefined ? formatTime(line.timestamp) : ''}
                </div>
                
                {line.timestamp !== undefined && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustTimestamp(index, 0.1);
                      }}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustTimestamp(index, 0.25);
                      }}
                    >
                      <ChevronsRight className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            {/* 右侧：歌词内容 */}
            <div className="flex-1 text-left text-neutral-800 dark:text-neutral-200">
              {line.text}
            </div>
          </div>
        ))}
          
          {/* End 按钮 */}
          <div className="flex items-center py-2 px-1 border-b border-neutral-100 dark:border-neutral-800">
            <div className="w-64 flex items-center gap-1 pr-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-sm"
                onClick={setEndTimestamp}
              >
                End
              </Button>
              <div className="w-20 text-sm font-mono text-neutral-500 dark:text-neutral-400 text-center">
                {formatTime(currentTime)}
              </div>
            </div>
            <div className="flex-1 text-left text-neutral-500 dark:text-neutral-400 italic">
              设置结束时间戳
            </div>
          </div>
        </div>
    </div>
  );
};

export default Sync;