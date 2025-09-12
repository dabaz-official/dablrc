import Image from 'next/image';

import Link from 'next/link';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Edit from '../editor/Edit';
import Sync from '../editor/Sync';

const navigation = [
  { name: 'Edit', href: '/edit', current: true },
  { name: 'Sync', href: '/sync', current: false },
]

const Navbar = () => {
  return (
    <div>
      <Tabs className="min-h-full">
      <TabsList className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Image
                  src="/logo/logo-dark.png"
                  alt="DabLRC"
                  width={64}
                  height={64}
                  className="block h-8 w-auto dark:hidden"
                />
                <Image
                  src="/logo/logo-light.png"
                  alt="DabLRC"
                  width={64}
                  height={64}
                  className="hidden h-8 w-auto dark:block"
                />
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                <TabsTrigger value="edit">
                  <Link href="/edit" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium">
                    Edit
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="sync">
                  <Link href="/sync" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium">
                    Sync
                  </Link>
                </TabsTrigger>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
            </div>
          </div>
        </TabsList>
      </Tabs>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">Dashboard</h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <TabsContent value="edit">
              <Edit />
            </TabsContent>
            <TabsContent value="sync">
              <Sync />
            </TabsContent>
          </div>
        </main>
      </div>
    </div>
  )
};

export default Navbar;