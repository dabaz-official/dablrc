import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AudioProvider } from '@/contexts/AudioContext';
import LayoutContent from '@/components/layout/LayoutContent';

const inter = Inter({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: "DabLRC",
    template: "%s - DabLRC",
  },
  description: "Create and edit your LRC files.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-neutral-100 dark:bg-neutral-900 antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <AudioProvider>
            <LayoutContent>{children}</LayoutContent>
          </AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
