import type { Metadata } from 'next';
import { profile } from '@/data/profile';
import './globals.css';

export const metadata: Metadata = {
  title: `${profile.displayName} · ${profile.role}`,
  description: profile.intro[0],
  metadataBase: new URL('https://me.cosmoslog.org'),
  openGraph: {
    title: `${profile.displayName} · ${profile.role}`,
    description: profile.intro[0],
    url: 'https://me.cosmoslog.org',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
