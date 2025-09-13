'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Download, FileUp } from 'lucide-react';

import { AudioProvider } from '@/contexts/AudioContext';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/contexts/AudioContext';
import { exportLrcFile, generateLrcFilename } from '@/lib/lrcParser';
import UploadModal from '@/components/ui/UploadModal';

interface LayoutContentProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<LayoutContentProps> = ({ children }) => {
  const { audioFile, lyrics } = useAudio();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const handleSave = () => {
    if (lyrics.lines.length === 0) {
      alert('No lyrics to export. Please add lyrics in the Edit page first.');
      return;
    }
    
    const filename = generateLrcFilename(audioFile?.name);
    exportLrcFile(lyrics.lines, filename);
  };

  const handleUpload = () => {
    setIsUploadModalOpen(true);
  };
  
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const navigation = [
    { name: 'Edit', href: '/edit', current: pathname === '/edit' },
    { name: 'Sync', href: '/sync', current: pathname === '/sync' },
  ];
    
  return (
    <AudioProvider>
      <div className="min-h-full">
        <nav className="bg-white dark:bg-black border-b border-neutral-100 dark:border-neutral-900 fixed top-0 left-0 right-0 z-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Image
                    alt="DabLRC"
                    src="/logo/logo-dark.png"
                    width={128}
                    height={128}
                    className="size-8 block dark:hidden"
                  />
                  <Image
                    alt="DabLRC"
                    src="/logo/logo-light.png"
                    width={128}
                    height={128}
                    className="size-8 hidden dark:block"
                  />
                </div>
                <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={item.current ? 'page' : undefined}
                      className={clsx(
                        item.current
                          ? 'text-neutral-900'
                          : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                        'inline-flex items-center px-1 pt-1 text-sm font-medium',
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                {audioFile && (
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-48">
                    {audioFile.name}
                  </span>
                )}
                <Button 
                  variant="outline"
                  className="text-sm/6 font-semibold cursor-pointer"
                  onClick={handleUpload}
                >
                  Upload
                  <FileUp />
                </Button>
                <Button 
                  className="text-sm/6 font-semibold cursor-pointer"
                  onClick={handleSave}
                >
                  Save
                  <Download />
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <div className={`py-12`}>
          {children}
        </div>
      </div>
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
      <AudioPlayer />
    </AudioProvider>
  );
};

export default LayoutContent;