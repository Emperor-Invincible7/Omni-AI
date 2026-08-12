import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OMNI-AI',
  description: 'OMNI-AI — industrial monochrome AI workspace.',
};

/**
 * Root layout. We set `data-theme="dark"` on <html> as the SSR default so
 * the server-rendered HTML and the first client paint match. The
 * ThemeProvider then overrides this from localStorage on mount inside a
 * useEffect, which is hydration-safe (no mismatch warning).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}