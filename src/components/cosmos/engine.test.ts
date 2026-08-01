import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCosmos } from './engine';
import { resolveParams } from './params';

function stubCanvas() {
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    canvas: { width: 0, height: 0 },
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
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 1200, height: 800, left: 0, top: 0 }),
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

function stubNodes(ids: string[]) {
  return ids.map((id, i) => ({
    id,
    ring: 0,
    baseAngle: (i / ids.length) * Math.PI * 2,
    element: document.createElement('a'),
  }));
}

const desktop = resolveParams({ hasFinePointer: true, prefersReducedMotion: false });
const reduced = resolveParams({ hasFinePointer: true, prefersReducedMotion: true });

function noopCallbacks() {
  return { onFront: vi.fn(), onPhase: vi.fn(), onEnterVisible: vi.fn() };
}

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

describe('createCosmos 생명주기', () => {
  it('start 전에는 그리지 않는다', () => {
    const { canvas, ctx } = stubCanvas();
    createCosmos(canvas, desktop, noopCallbacks());
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('start하면 그린다', () => {
    const { canvas, ctx } = stubCanvas();
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.start();
    expect(ctx.fillRect).toHaveBeenCalled();
    h.destroy();
  });

  it('destroy하면 window 이벤트를 모두 해제한다', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { canvas } = stubCanvas();
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.start();
    h.destroy();
    const removed = spy.mock.calls.map((c) => c[0]);
    for (const name of ['pointermove', 'resize']) expect(removed).toContain(name);
    spy.mockRestore();
  });

  it('destroy를 두 번 호출해도 예외가 없다', () => {
    const { canvas } = stubCanvas();
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.start();
    h.destroy();
    expect(() => h.destroy()).not.toThrow();
  });
});

describe('페이즈 진행', () => {
  it('처음에는 워프 단계를 알린다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, desktop, cb);
    h.start();
    expect(cb.onPhase).toHaveBeenCalledWith('warp');
    h.destroy();
  });

  it('2초가 지나면 진입 버튼을 띄우라고 알린다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, desktop, cb);
    h.start();
    vi.advanceTimersByTime(16 * 130);
    expect(cb.onEnterVisible).toHaveBeenCalledWith(true);
    h.destroy();
  });

  it('enter를 부르면 결국 성좌에 도달한다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, desktop, cb);
    h.start();
    h.enter();
    vi.advanceTimersByTime(16 * 120);
    expect(cb.onPhase).toHaveBeenCalledWith('orbit');
    h.destroy();
  });

  it('모션 감소 설정이면 워프 없이 성좌에서 시작한다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, reduced, cb);
    h.start();
    expect(cb.onPhase).toHaveBeenCalledWith('orbit');
    expect(cb.onPhase).not.toHaveBeenCalledWith('warp');
    h.destroy();
  });
});

describe('DOM 노드 배치', () => {
  it('성좌 단계에서 노드에 transform을 쓴다', () => {
    const { canvas } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, reduced, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    expect(nodes[0].element.style.transform).toContain('translate3d');
    h.destroy();
  });

  it('React 상태를 거치지 않고 정면 별을 알린다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, reduced, cb);
    h.setNodes(stubNodes(['todo', 'blog', 'meetup']));
    h.start();
    expect(cb.onFront).toHaveBeenCalled();
    expect(typeof cb.onFront.mock.calls[0][0]).toBe('string');
    h.destroy();
  });

  it('정면이 바뀌지 않으면 다시 알리지 않는다', () => {
    // 매 프레임 알리면 React가 매 프레임 리렌더된다
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, reduced, cb);
    h.setNodes(stubNodes(['todo']));
    h.start();
    const first = cb.onFront.mock.calls.length;
    vi.advanceTimersByTime(16 * 30);
    expect(cb.onFront.mock.calls.length).toBe(first);
    h.destroy();
  });

  it('노드를 비우면 정면이 null이 된다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, reduced, cb);
    h.setNodes(stubNodes(['todo']));
    h.start();
    cb.onFront.mockClear();
    h.setNodes([]);
    expect(cb.onFront).toHaveBeenCalledWith(null);
    h.destroy();
  });
});

describe('회전 조작', () => {
  it('drag는 노드 위치를 바꾼다', () => {
    const { canvas } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, reduced, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    const before = nodes[0].element.style.transform;
    h.drag(120);
    expect(nodes[0].element.style.transform).not.toBe(before);
    h.destroy();
  });

  it('setPaused(true)면 자동 회전이 멈춘다', () => {
    const { canvas } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    h.enter();
    vi.advanceTimersByTime(16 * 120);
    h.setPaused(true);
    const frozen = nodes[0].element.style.transform;
    vi.advanceTimersByTime(16 * 60);
    expect(nodes[0].element.style.transform).toBe(frozen);
    h.destroy();
  });
});
