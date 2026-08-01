'use client';

import type { Profile } from '@/types';

type Props = {
  profile: Profile;
  onOpen: () => void;
};

export function CoreStar({ profile, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="absolute left-1/2 top-[46%] z-30 flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full px-6 py-4 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 rounded-full bg-[#fff8e6] shadow-[0_0_28px_12px_rgba(255,214,140,0.35)]"
      />
      <span className="mt-2 text-base font-semibold text-[#fffaeb]">{profile.displayName}</span>
      <span className="text-xs text-[color:var(--cosmos-muted)]">{profile.role}</span>
    </button>
  );
}
