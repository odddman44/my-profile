'use client';

import { forwardRef } from 'react';
import { CENTER_Y_RATIO } from '@/components/cosmos/orbit';
import type { Profile } from '@/types';

type Props = {
  profile: Profile;
  onOpen: () => void;
};

export const CoreStar = forwardRef<HTMLButtonElement, Props>(function CoreStar(
  { profile, onOpen },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      // 궤도 중심 y좌표는 orbit.ts의 CENTER_Y_RATIO를 그대로 쓴다 —
      // 하드코딩하면 renderer.ts의 궤도선과 어긋날 수 있다 (F-6)
      style={{ top: `${CENTER_Y_RATIO * 100}%` }}
      className="absolute left-1/2 z-30 flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full px-6 py-4 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 rounded-full bg-[#fff8e6] shadow-[0_0_28px_12px_rgba(255,214,140,0.35)]"
      />
      <span className="mt-2 text-base font-semibold text-[#fffaeb]">{profile.displayName}</span>
      <span className="text-xs text-[color:var(--cosmos-muted)]">{profile.role}</span>
    </button>
  );
});
