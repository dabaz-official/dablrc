import Link from 'next/link';
import Image from 'next/image';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex flex-col">
      <nav aria-label="Global" className="flex items-center justify-between p-4 lg:px-8 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-700">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex flex-row space-x-2">
            <span className="sr-only">DabLRC</span>
            <Image
              src="/logo/logo-dark.png"
              alt="The logo of DabLRC"
              width={40}
              height={40}
              className="h-8 w-auto block dark:hidden"
            />
            <Image
              src="/logo/logo-light.png"
              alt="The logo of DabLRC"
              width={40}
              height={40}
              className="h-8 w-auto hidden dark:block"
            />
            <h2 className="text-2xl font-bold dark:text-white tracking-tight">
              DabLRC
            </h2>
          </Link>
        </div>
        <div className="hidden lg:flex lg:gap-x-12">
          <Link href="/edit" className="font-semibold text-neutral-900 dark:text-white">
            Edit
          </Link>
          <Link href="/sync" className="font-semibold text-neutral-900 dark:text-white">
            Sync
          </Link>
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Button className="text-sm/6 font-semibold">
            Save
            <Download />
          </Button>
        </div>
      </nav>
    </header>
  )
};

export default Header;
