import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';

import './globals.css';
import Header from '@/components/layout/Header';
import { ThemeProvider } from '@/components/providers/theme-provider';

export const metadata: Metadata = {
  title: "DabLRC",
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
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
