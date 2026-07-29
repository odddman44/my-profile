import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

export function GlassPanel({ children, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[rgba(8,10,22,0.55)] p-6 backdrop-blur-md sm:p-10 ${className}`}
    >
      {children}
    </div>
  );
}
