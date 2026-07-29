'use client';

import { useEffect, useRef } from 'react';

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function update() {
      const bar = barRef.current;
      if (!bar) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      // width 대신 transform: scaleX를 쓴다 — width 변경은 레이아웃 재계산을 유발하지만
      // transform은 합성 단계에서만 처리되어 스크롤 중 프레임이 끊기지 않는다
      bar.style.transform = `scaleX(${ratio})`;
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-px">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-indigo-300/70 via-violet-300/80 to-sky-300/70 shadow-[0_0_8px_rgba(167,180,255,0.6)]"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
