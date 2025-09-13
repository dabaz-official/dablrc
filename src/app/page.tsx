'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/edit');
  }, [router]);

  return (
    <div className="flex justify-center">
      <div className="w-full sm:w-1/2 xl:w-1/3 p-4 overflow-hidden">
        <Skeleton className="w-[360px] h-5" />
      </div>
    </div>
  );
}