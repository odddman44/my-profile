import { createLayers, type StarLayer, type Viewport } from './field';
import type { CosmosParams } from './params';
import { createRenderer, type RenderState } from './renderer';

export type CosmosHandle = {
  start(): void;
  stop(): void;
  destroy(): void;
};

/** 마우스 추적 감쇠 계수. 낮을수록 부드럽게 따라온다 */
const EASING = 0.045;
/** 리사이즈 디바운스(ms). 창을 드래그로 늘이는 동안 별을 매번 재생성하지 않기 위함 */
const RESIZE_DEBOUNCE = 150;

export function createCosmos(canvas: HTMLCanvasElement, params: CosmosParams): CosmosHandle {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { start() {}, stop() {}, destroy() {} };
  }

  const renderer = createRenderer(ctx);
  let viewport: Viewport = { width: 0, height: 0 };
  let layers: StarLayer[] = [];
  let frameId: number | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const target = { x: 0, y: 0 };
  const state: RenderState = {
    time: 0,
    mouse: { x: 0, y: 0 },
    cursor: { x: 0, y: 0 },
    pointerActive: false,
    scrollY: 0,
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, params.dprCap);
    viewport = { width: rect.width, height: rect.height };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    // 위에서 null 체크했지만 클로저 안에서는 narrowing이 유지되지 않는다
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    layers = createLayers(params.starCount);
  }

  function handleResize() {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      resize();
      // 애니메이션이 꺼진 상태에서 창 크기가 바뀌면 캔버스가 비어 버린다.
      // 정지 화면을 다시 그려준다.
      if (!params.animate && !destroyed) frame();
    }, RESIZE_DEBOUNCE);
  }

  function handleMouseMove(event: MouseEvent) {
    target.x = event.clientX / window.innerWidth - 0.5;
    target.y = event.clientY / window.innerHeight - 0.5;
    state.cursor.x = event.clientX;
    state.cursor.y = event.clientY;
    state.pointerActive = true;
  }

  function handleMouseLeave() {
    state.pointerActive = false;
    target.x = 0;
    target.y = 0;
  }

  function handleScroll() {
    state.scrollY = window.scrollY;
  }

  function handleVisibility() {
    if (document.visibilityState === 'hidden') stop();
    else if (!destroyed && params.animate) start();
  }

  function frame() {
    state.time += 1;
    // 마우스를 뗐을 때 중앙으로 서서히 복귀시킨다
    state.mouse.x += (target.x - state.mouse.x) * EASING;
    state.mouse.y += (target.y - state.mouse.y) * EASING;

    renderer.draw(layers, state, params, viewport);

    if (params.animate) {
      frameId = requestAnimationFrame(frame);
    }
  }

  function start() {
    if (destroyed || frameId !== null) return;
    if (viewport.width === 0) resize();
    frame();
  }

  function stop() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  window.addEventListener('mouseout', handleMouseLeave, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibility);

  return {
    start,
    stop,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    },
  };
}
