'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from '@/contexts/AudioContext';

export default function HomePage() {
  const router = useRouter();
  const { setAudioFile } = useAudio();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a'];
    const allowedExtensions = ['.mp3', '.m4a', '.wav'];
    
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setError('请上传 MP3、M4A 或 WAV 格式的音频文件');
      return;
    }
    
    setError(null);
    
    // 创建文件 URL 并存储到音频上下文
    const fileUrl = URL.createObjectURL(file);
    setAudioFile({
      name: file.name,
      file: file,
      url: fileUrl
    });
    
    // 上传成功，重定向到编辑页面
    router.push('/edit');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Upload Audio File
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Upload your audio file to start creating LRC lyrics
          </p>
        </div>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-neutral-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            Drop your audio file here
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            or click to browse
          </p>
          
          <input
            type="file"
            accept=".mp3,.m4a,.wav,audio/mp3,audio/mpeg,audio/mp4,audio/m4a,audio/wav"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200"
          >
            Choose File
          </label>
          
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
            Supported formats: MP3, M4A, WAV
          </p>
        </div>
      </div>
    </div>
  );
}