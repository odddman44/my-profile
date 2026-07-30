import type { Metadata } from 'next';
import { CosmosBackground } from '@/components/cosmos/CosmosBackground';
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
        {/* JS가 꺼지면 Reveal의 visible 상태가 절대 true가 되지 않아 콘텐츠가 opacity-0로 고정된다 — 이를 강제로 무효화한다 */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <CosmosBackground />
        {children}
      </body>
    </html>
  );
}
