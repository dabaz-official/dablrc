/**
 * 解析 LRC 格式的歌词文件
 * 支持格式：[mm:ss.xx] 歌词内容
 */

export interface ParsedLyricLine {
  text: string;
  timestamp?: number; // 时间戳，以秒为单位
}

/**
 * 将时间戳字符串转换为秒数
 * @param timeStr 时间戳字符串，格式如 "00:11.77"
 * @returns 时间戳的秒数
 */
export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseFloat(parts[1]);
  
  if (isNaN(minutes) || isNaN(seconds)) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  
  return minutes * 60 + seconds;
}

/**
 * 解析单行 LRC 歌词
 * @param line 歌词行，可能包含时间戳
 * @returns 解析后的歌词对象
 */
export function parseLyricLine(line: string): ParsedLyricLine {
  const trimmedLine = line.trim();
  
  // 匹配 LRC 时间戳格式：[mm:ss.xx]
  const timeRegex = /^\[(\d{2}:\d{2}\.\d{2})\]\s*(.*)$/;
  const match = trimmedLine.match(timeRegex);
  
  if (match) {
    const timeStr = match[1];
    const text = match[2].trim();
    
    try {
      const timestamp = parseTimeToSeconds(timeStr);
      return {
        text,
        timestamp
      };
    } catch (error) {
      // 如果时间戳解析失败，返回原始文本
      return {
        text: trimmedLine
      };
    }
  }
  
  // 没有时间戳的普通歌词行
  return {
    text: trimmedLine
  };
}

/**
 * 解析完整的 LRC 歌词文本
 * @param lrcText LRC 格式的歌词文本
 * @returns 解析后的歌词数组
 */
export function parseLrcText(lrcText: string): ParsedLyricLine[] {
  const lines = lrcText.split('\n');
  const parsedLines: ParsedLyricLine[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 跳过空行
    if (trimmedLine === '') {
      continue;
    }
    
    // 跳过 LRC 元数据行（如 [ar:], [ti:], [al:] 等）
    if (/^\[\w+:.*\]$/.test(trimmedLine)) {
      continue;
    }
    
    const parsedLine = parseLyricLine(trimmedLine);
    
    // 只添加有内容的歌词行
    if (parsedLine.text !== '') {
      parsedLines.push(parsedLine);
    }
  }
  
  return parsedLines;
}

/**
 * 格式化时间戳为 LRC 格式
 * @param seconds 时间戳（秒）
 * @returns LRC 格式的时间戳字符串
 */
export function formatTimeToLrc(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  const minutesStr = minutes.toString().padStart(2, '0');
  const secondsStr = remainingSeconds.toFixed(2).padStart(5, '0');
  
  return `${minutesStr}:${secondsStr}`;
}

/**
 * 将解析后的歌词转换回 LRC 格式
 * @param lines 解析后的歌词数组
 * @returns LRC 格式的歌词文本
 */
export function formatToLrc(lines: ParsedLyricLine[]): string {
  return lines
    .map(line => {
      if (line.timestamp !== undefined) {
        const timeStr = formatTimeToLrc(line.timestamp);
        return `[${timeStr}] ${line.text}`;
      }
      return line.text;
    })
    .join('\n');
}

/**
 * 导出 LRC 文件
 * @param lines 歌词数据
 * @param filename 文件名（不包含扩展名）
 */
export function exportLrcFile(lines: ParsedLyricLine[], filename: string = 'lyrics'): void {
  // 生成 LRC 格式内容
  const lrcContent = formatToLrc(lines);
  
  // 创建 Blob 对象
  const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' });
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.lrc`;
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  
  // 清理
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 生成建议的文件名
 * @param audioFileName 音频文件名
 * @returns 建议的 LRC 文件名（不包含扩展名）
 */
export function generateLrcFilename(audioFileName?: string): string {
  if (audioFileName) {
    // 移除音频文件的扩展名
    const nameWithoutExt = audioFileName.replace(/\.[^/.]+$/, '');
    return nameWithoutExt;
  }
  
  // 默认文件名
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  return `lyrics-${timestamp}`;
}