'use client';

import { useEffect, useRef } from 'react';
import { createCosmos } from './engine';
import { readEnvironment } from './environment';
import { resolveParams } from './params';

export function CosmosBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = createCosmos(canvas, resolveParams(readEnvironment()));
    handle.start();
    // 마우스 좌표와 애니메이션 상태는 엔진 내부(ref 기반)에서만 관리되므로
    // 이 컴포넌트는 마운트 이후 리렌더될 필요가 없다. 의존성 배열은 항상 비어 있어야 한다.
    return () => handle.destroy();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
