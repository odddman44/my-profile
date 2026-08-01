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
    const h = createCosmos(canvas, desktop, noopCallbacks());
    expect(ctx.fillRect).not.toHaveBeenCalled();
    h.destroy();
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

  it('stop하면 프레임이 더 이상 진행되지 않는다', () => {
    const { canvas, ctx } = stubCanvas();
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.start();
    h.stop();
    const afterStop = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;
    vi.advanceTimersByTime(16 * 60);
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBe(afterStop);
    h.destroy();
  });

  it('리사이즈해도 배경 별을 재생성하지 않는다', () => {
    // 정규화 좌표를 재사용해야 분포가 유지된다. 모바일에서 주소창 접힘/펼침처럼
    // 반복되는 resize 이벤트가 매번 별을 다시 뽑으면 화면이 눈에 띄게 재배치된다.
    // reduced를 쓰는 이유: desktop은 워프 단계에서 별이 재활용될 때도 Math.random을
    // 불러 순수하게 "리사이즈로 인한 재생성"만 격리해 관측하기 어렵다.
    const randomSpy = vi.spyOn(Math, 'random');
    const { canvas } = stubCanvas();
    const h = createCosmos(canvas, reduced, noopCallbacks());
    h.start();

    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(200);
    const callsAfterFirstResize = randomSpy.mock.calls.length;

    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(200);
    expect(randomSpy.mock.calls.length).toBe(callsAfterFirstResize);

    h.destroy();
    randomSpy.mockRestore();
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

  it('start 전에 setNodes를 호출해도 뷰포트가 잡히고 transform이 채워진다', () => {
    // setNodes -> start 순서로 부르는 소비자가 있다. resize()가 start()에서만
    // 일어나면 이 순서에서 뷰포트가 0x0으로 영원히 고정된다.
    // desktop 파라미터를 쓰는 이유: reduced는 keepGoing이 한 프레임 만에 꺼져
    // frameId가 다시 null이 되므로 start()가 절대 막히지 않아 버그를 재현하지 못한다.
    // desktop은 루프가 계속 돌아 start()의 `frameId !== null` 이른 반환을 실제로 유발한다.
    const { canvas } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    expect(canvas.width).toBeGreaterThan(0);
    expect(nodes[0].element.style.transform).toContain('translate3d');
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

  it('일시정지 중 조준이 진행돼도 프레임을 무한히 예약하지 않는다', () => {
    // aim()이 rotation.target을 세운 채로 일시정지되면, keepGoing이 target만 보고
    // paused를 무시할 경우 모션 감소 설정에서도 60fps로 영원히 다시 그리게 된다.
    const { canvas, ctx } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, reduced, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    h.setPaused(true);
    h.aim('blog');

    const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
    const callsAfterAim = fillRect.mock.calls.length;
    vi.advanceTimersByTime(16 * 300);
    expect(fillRect.mock.calls.length - callsAfterAim).toBeLessThan(5);
    h.destroy();
  });
});
