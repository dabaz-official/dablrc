'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { parseLrcText } from '@/lib/lrcParser';

const Edit = () => {
  const [lyrics, setLyrics] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setLyrics: setGlobalLyrics } = useAudio();

  const handleLyricsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLyrics = event.target.value;
    setLyrics(newLyrics);
    
    // 解析 LRC 格式的歌词，提取时间戳
    const parsedLines = parseLrcText(newLyrics);
    setGlobalLyrics({ lines: parsedLines });
  };

  // 自动调整 textarea 高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 先设置初始高度
      textarea.style.height = '200px';
      // 重置高度以获取正确的 scrollHeight
      textarea.style.height = 'auto';
      // 设置新高度，但不小于初始高度
      const newHeight = Math.max(textarea.scrollHeight, 200); // 200px 作为最小高度
      textarea.style.height = `${newHeight}px`;
    }
  }, [lyrics]);

  return (
    <div className="flex justify-center">
      <textarea
        ref={textareaRef}
        value={lyrics}
        onChange={handleLyricsChange}
        placeholder="Enter your lyrics here..."
        className="w-full sm:w-1/2 xl:w-1/4 min-h-[200px] p-4 resize-none focus:outline-none bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono text-sm leading-relaxed border-none overflow-hidden"
      />
    </div>
  );
};

export default Edit;