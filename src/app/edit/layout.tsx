import { Metadata } from 'next';

import Header from '@/components/layout/Header';

export const metadata: Metadata = {
  title: "Edit",
};

export default function EditLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <Header />
      <div className="py-4 md:py-8 overflow-auto">
        {children}
      </div>
    </div>
  );
}