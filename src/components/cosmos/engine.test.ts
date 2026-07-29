import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCosmos } from './engine';
import { resolveParams } from './params';

/** jsdom에 2D 컨텍스트가 없으므로 호출만 기록하는 스텁을 만든다 */
function stubCanvas() {
  const calls = { fillRect: 0, arc: 0, ellipse: 0 };
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    canvas: { width: 0, height: 0 },
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(() => { calls.fillRect++; }),
    beginPath: vi.fn(),
    arc: vi.fn(() => { calls.arc++; }),
    ellipse: vi.fn(() => { calls.ellipse++; }),
    fill: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    createLinearGradient: vi.fn(() => gradient),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 1000, height: 800, left: 0, top: 0 }),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx, calls };
}

const desktop = resolveParams({ hasFinePointer: true, prefersReducedMotion: false });
const reduced = resolveParams({ hasFinePointer: true, prefersReducedMotion: true });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createCosmos', () => {
  it('start 전에는 아무것도 그리지 않는다', () => {
    const { canvas, calls } = stubCanvas();
    createCosmos(canvas, desktop);
    expect(calls.arc).toBe(0);
  });

  it('start하면 별을 그린다', () => {
    const { canvas, calls } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    expect(calls.arc).toBeGreaterThan(0);
  });

  it('애니메이션이 켜져 있으면 프레임이 반복된다', () => {
    const { canvas, calls } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    const afterFirst = calls.arc;
    vi.advanceTimersByTime(100);
    expect(calls.arc).toBeGreaterThan(afterFirst);
    handle.destroy();
  });

  it('모션 감소 설정에서는 한 프레임만 그리고 멈춘다', () => {
    const { canvas, calls } = stubCanvas();
    const handle = createCosmos(canvas, reduced);
    handle.start();
    const afterFirst = calls.arc;
    vi.advanceTimersByTime(500);
    expect(calls.arc).toBe(afterFirst);
    handle.destroy();
  });

  it('stop하면 프레임이 더 이상 진행되지 않는다', () => {
    const { canvas, calls } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    handle.stop();
    const afterStop = calls.arc;
    vi.advanceTimersByTime(200);
    expect(calls.arc).toBe(afterStop);
    handle.destroy();
  });

  it('destroy하면 window 이벤트 리스너가 모두 해제된다', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { canvas } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    handle.destroy();

    const removed = removeSpy.mock.calls.map((call) => call[0]);
    expect(removed).toContain('mousemove');
    expect(removed).toContain('scroll');
    expect(removed).toContain('resize');
    removeSpy.mockRestore();
  });

  it('destroy를 두 번 호출해도 예외가 나지 않는다', () => {
    const { canvas } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    handle.destroy();
    expect(() => handle.destroy()).not.toThrow();
  });
});
