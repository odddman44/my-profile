'use client';

import { useEffect, useRef } from 'react';
import type { ProjectStatus } from '@/types';

export type PanelContent = {
  title: string;
  body: string[];
  tech?: string[];
  status?: ProjectStatus;
  href?: string;
  hrefLabel?: string;
};

type Props = {
  content: PanelContent | null;
  onClose: () => void;
};

export function StarPanel({ content, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!content) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [content, onClose]);

  useEffect(() => {
    if (!content) return;
    // 별에서 Enter로 열었을 때 포커스가 별에 남으면 패널까지 Tab을 여러 번 눌러야 한다
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previous?.focus?.();
  }, [content]);

  if (!content) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={content.title}
      tabIndex={-1}
      className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-white/12 bg-[rgba(8,10,22,0.9)] p-6 backdrop-blur-md focus:outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[22rem] sm:-translate-x-1/2 sm:-translate-y-1/2"
    >
      <div className="mb-2 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-[#f2f5ff]">{content.title}</h2>
        {content.status === 'building' && (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[11px] text-amber-200">
            개발 중
          </span>
        )}
      </div>

      {content.body.map((line) => (
        <p key={line} className="mb-2 text-sm leading-relaxed text-[color:var(--cosmos-muted)]">
          {line}
        </p>
      ))}

      {content.tech && content.tech.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {content.tech.map((item) => (
            <li
              key={item}
              className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-[color:var(--cosmos-muted)]"
            >
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center justify-between gap-4">
        {content.href ? (
          <a
            href={content.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#c7d2fe] underline underline-offset-4 hover:text-white"
          >
            {content.hrefLabel ?? '바로가기'} →
          </a>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] rounded-full border border-white/15 px-4 text-sm text-[color:var(--cosmos-muted)] hover:text-white"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
