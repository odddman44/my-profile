import type { CosmosEnvironment } from './params';

export function readEnvironment(): CosmosEnvironment {
  // 화면 폭으로 나누면 터치스크린 노트북에서 오판한다. 포인터 특성으로 판단한다.
  const hasFinePointer =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return { hasFinePointer, prefersReducedMotion };
}
