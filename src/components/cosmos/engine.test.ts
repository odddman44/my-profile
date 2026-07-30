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

  it('리사이즈해도 별을 재생성하지 않는다 (정규화 좌표를 재사용해야 분포가 유지된다)', () => {
    // createLayers는 인자를 안 주면 Math.random을 기본값으로 사용해 별 좌표를 뽑는다.
    // 이 인스턴스가 리사이즈마다 별을 다시 만든다면, 리사이즈할 때마다 Math.random 호출 수가
    // 계속 늘어난다. 첫 번째 리사이즈 이후와 두 번째 리사이즈 이후의 누적 호출 수를 비교해
    // "두 번째 리사이즈에서 추가로 재생성이 일어나는가"만 순수하게 관측한다 — 이렇게 하면
    // 다른 테스트에서 destroy되지 않고 남아있는 인스턴스가 window resize 이벤트에 함께
    // 반응하더라도(최초 1회성 잡음) 결과가 흔들리지 않는다.
    const randomSpy = vi.spyOn(Math, 'random');
    const { canvas } = stubCanvas();
    const handle = createCosmos(canvas, desktop);

    handle.start();

    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(200);
    const callsAfterFirstResize = randomSpy.mock.calls.length;

    // iOS 주소창 접힘/펼침처럼 반복되는 리사이즈도 재생성을 유발하면 안 된다
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(200);
    expect(randomSpy.mock.calls.length).toBe(callsAfterFirstResize);

    handle.destroy();
    randomSpy.mockRestore();
  });
});
