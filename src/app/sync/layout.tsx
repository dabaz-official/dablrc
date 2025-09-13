import { Metadata } from 'next';

import LayoutContent from '@/components/layout/LayoutContent';

export const metadata: Metadata = {
  title: "Sync",
};

export default function SyncLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="overflow-auto">
      {children}
    </div>
  );
}