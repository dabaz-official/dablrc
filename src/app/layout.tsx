import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';

import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import LayoutContent from '@/components/layout/LayoutContent';
import Navbar from '@/components/layout/Navbar';

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
        className={`${GeistMono.className} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <Navbar />
          <LayoutContent>{children}</LayoutContent>
        </ThemeProvider>
      </body>
    </html>
  );
}
