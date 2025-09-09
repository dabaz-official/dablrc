'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileMusic, X } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const router = useRouter();
  const { setAudioFile } = useAudio();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a'];
    const allowedExtensions = ['.mp3', '.m4a', '.wav'];
    
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setError('Please upload MP3, M4A or WAV format audio files');
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
    
    // 上传成功，关闭弹窗并重定向到编辑页面
    onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* 弹窗内容 */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Upload Audio File
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Upload your audio file to start creating LRC lyrics
            </p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="mb-4">
              <FileMusic className="mx-auto h-10 w-10 text-neutral-400" />
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
              id="modal-file-upload"
            />
            
            <label
              htmlFor="modal-file-upload"
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
    </div>
  );
}