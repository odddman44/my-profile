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

  // F-5: 워프 동안 opacity만 0이면 앵커가 여전히 탭 순서에 남아, 키보드 사용자가
  // Tab을 누를 때마다 보이지 않는 별을 차례로 지나치게 된다(WCAG 2.4.7). jsdom의
  // canvas.getContext('2d')는 null이라 React 테스트는 엔진을 우회하므로, 여기서
  // stubCanvas로 실제 getContext를 흉내 내 엔진 레벨에서 검증한다.
  it('워프 동안 별 요소는 visibility:hidden이라 탭 순서에서 빠진다', () => {
    const { canvas } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    expect(nodes[0].element.style.opacity).toBe('0');
    expect(nodes[0].element.style.visibility).toBe('hidden');
    h.destroy();
  });

  it('성좌 단계에 들어오면 별 요소가 다시 visibility:visible이 된다', () => {
    const { canvas } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    h.enter();
    vi.advanceTimersByTime(16 * 120);
    expect(nodes[0].element.style.visibility).toBe('visible');
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

describe('중심 항성(코어) 시각성', () => {
  // F-4: CoreStar가 항상 렌더링되어 워프 첫 프레임부터 이름·역할이 화면 중앙에
  // 떠 있었다. 별과 같은 settleT 메커니즘을 그대로 태워 "감속 중 항성이 점화된다"는
  // 스펙(§4)을 만족시키고, F-5와 같은 이유로 보이지 않을 때는 포커스도 받지 않아야 한다.
  it('워프 동안에는 코어 요소도 opacity 0 · visibility hidden이다', () => {
    const { canvas } = stubCanvas();
    const core = document.createElement('button');
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.setCoreElement(core);
    h.start();
    expect(core.style.opacity).toBe('0');
    expect(core.style.visibility).toBe('hidden');
    h.destroy();
  });

  it('성좌 단계에 들어오면 코어 요소가 보이고 상호작용 가능해진다', () => {
    const { canvas } = stubCanvas();
    const core = document.createElement('button');
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.setCoreElement(core);
    h.start();
    h.enter();
    vi.advanceTimersByTime(16 * 120);
    expect(core.style.visibility).toBe('visible');
    expect(Number(core.style.opacity)).toBeGreaterThan(0);
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

  it('일시정지 중 조준이 진행되면 수렴할 때까지만 프레임을 그리고 스스로 멈춘다', () => {
    // F-1: 조준은 사용자가 요청한 이동이므로 paused여도 진행되어야 한다(약 78프레임).
    // 이전에는 keepGoing이 target과 함께 !paused를 봐서 조준이 아예 진행되지 않았고,
    // 그 결과 "무한 루프 방지"를 조준을 멈추는 방식으로 해결했었다. 이제는 target이
    // paused와 무관하게 수렴하므로, 루프도 수렴 후 스스로 멈추는지를 검증해야 한다.
    const { canvas, ctx } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, reduced, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    h.setPaused(true);
    h.aim('blog');

    const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
    const callsAfterAim = fillRect.mock.calls.length;
    // 수렴에 필요한 것보다 훨씬 긴 시간(300프레임)을 흘려보낸다
    vi.advanceTimersByTime(16 * 300);
    const callsAt300 = fillRect.mock.calls.length - callsAfterAim;
    expect(callsAt300).toBeGreaterThan(0);

    // 더 시간이 흘러도 더 이상 그리지 않아야 한다 — 루프가 스스로 멈췄다는 뜻이다
    vi.advanceTimersByTime(16 * 300);
    expect(fillRect.mock.calls.length - callsAfterAim).toBe(callsAt300);
    h.destroy();
  });
});
