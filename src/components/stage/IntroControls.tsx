'use client';

import type { Phase } from '@/types';

type Props = {
  phase: Phase;
  enterVisible: boolean;
  onEnter: () => void;
};

export function IntroControls({ phase, enterVisible, onEnter }: Props) {
  if (phase !== 'warp') return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center">
      <p className="absolute top-8 text-[0.7rem] uppercase tracking-[0.42em] text-[color:var(--cosmos-muted)]">
        me.cosmoslog.org
      </p>

      {enterVisible && (
        <button
          type="button"
          onClick={onEnter}
          className="pointer-events-auto min-h-[44px] rounded-full border border-white/35 bg-white/10 px-8 py-3 text-sm tracking-widest text-[#eef2ff] backdrop-blur-sm transition hover:bg-white/20"
        >
          진입
        </button>
      )}

      <button
        type="button"
        onClick={onEnter}
        className="pointer-events-auto absolute bottom-6 right-6 min-h-[44px] px-3 text-xs text-[color:var(--cosmos-muted)] underline underline-offset-4 hover:text-white"
      >
        건너뛰기
      </button>
    </div>
  );
}
