'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import { AudioProvider } from '@/contexts/AudioContext';
import AudioPlayer from '@/components/audio/AudioPlayer';

interface LayoutContentProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<LayoutContentProps> = ({ children }) => {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  
  return (
    <AudioProvider>
      <div className="min-h-full">
        <div className={`pb-20 ${isHomePage ? '' : 'pt-16'}`}>
          {children}
        </div>
      </div>
      <AudioPlayer />
    </AudioProvider>
  );
};

export default LayoutContent;