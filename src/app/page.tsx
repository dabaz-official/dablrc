'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center">
        <div className="mb-8">
          <div className="flex justify-center items-center mb-6">
            <Image
              src="/logo/logo-dark.png"
              alt="The logo of DabLRC"
              width={80}
              height={80}
              className="h-16 w-auto block dark:hidden mr-4"
            />
            <Image
              src="/logo/logo-light.png"
              alt="The logo of DabLRC"
              width={80}
              height={80}
              className="h-16 w-auto hidden dark:block mr-4"
            />
            <h1 className="text-5xl font-bold text-neutral-900 dark:text-neutral-100">
              DabLRC
            </h1>
          </div>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
            Create synchronized LRC lyrics for your audio files
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <Link 
            href="/edit"
            className="group p-6 bg-white dark:bg-neutral-900 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600"
          >
            <div className="text-blue-600 dark:text-blue-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Edit Lyrics
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Write and edit your lyrics text
            </p>
          </Link>
          
          <Link 
            href="/sync"
            className="group p-6 bg-white dark:bg-neutral-900 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600"
          >
            <div className="text-blue-600 dark:text-blue-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Sync Lyrics
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Synchronize lyrics with audio timing
            </p>
          </Link>
        </div>
        
        <div className="mt-12">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Use the Upload button in the header to add your audio file and get started
          </p>
        </div>
      </div>
    </div>
  );
}