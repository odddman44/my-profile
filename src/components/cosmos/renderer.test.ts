import { describe, expect, it, vi } from 'vitest';
import { createRenderer } from './renderer';
import { resolveParams } from './params';

const viewport = { width: 1200, height: 800 };
const params = resolveParams({ hasFinePointer: true, prefersReducedMotion: false });

function stubCtx() {
  const gradient = { addColorStop: vi.fn() };
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    createLinearGradient: vi.fn(() => gradient),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
  } as unknown as CanvasRenderingContext2D;
}

function baseState() {
  return {
    time: 0,
    mouse: { x: 0, y: 0 },
    cursor: { x: 0, y: 0 },
    pointerActive: false,
    settleT: 1,
  };
}

describe('drawOrbitRings', () => {
  it('점유된 궤도만큼만 타원을 그린다 — 빈 궤도는 그리지 않는다', () => {
    // ring 0(안쪽)과 1(바깥)에만 별이 있고, 예비 궤도 2는 비어 있는 실제 성좌 구성
    const ctx = stubCtx();
    const renderer = createRenderer(ctx);
    renderer.draw({
      layers: [],
      warpStars: [],
      state: baseState(),
      params,
      viewport,
      phase: 'orbit',
      occupiedRings: new Set([0, 1]),
    });
    expect((ctx.ellipse as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('궤도가 하나만 점유되면 타원도 하나만 그린다', () => {
    const ctx = stubCtx();
    const renderer = createRenderer(ctx);
    renderer.draw({
      layers: [],
      warpStars: [],
      state: baseState(),
      params,
      viewport,
      phase: 'orbit',
      occupiedRings: new Set([0]),
    });
    expect((ctx.ellipse as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});
