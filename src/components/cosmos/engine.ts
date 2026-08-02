import type { Phase } from '@/types';
import { createLayers, type StarLayer, type Viewport } from './field';
import {
  advanceRotation,
  aimAt,
  createRotation,
  dragRotation,
  frontMostId,
  orbitPositions,
  type OrbitSlot,
  type RotationState,
} from './orbit';
import type { CosmosParams } from './params';
import {
  advancePhase,
  createPhaseState,
  isEnterButtonVisible,
  requestEnter,
  type PhaseState,
} from './phase';
import { createRenderer, type RenderState } from './renderer';
import { advanceWarpStar, createWarpStars, type WarpStar } from './warp';

export type StageNode = OrbitSlot & { element: HTMLElement };

export type CosmosCallbacks = {
  onFront(id: string | null): void;
  onPhase(phase: Phase): void;
  onEnterVisible(visible: boolean): void;
};

export type CosmosHandle = {
  start(): void;
  stop(): void;
  destroy(): void;
  enter(): void;
  setNodes(nodes: StageNode[]): void;
  setCoreElement(element: HTMLElement | null): void;
  setPaused(paused: boolean): void;
  drag(deltaX: number): void;
  aim(id: string): void;
};

/** settleT에 맞춰 opacity와 탭 순서 포함 여부를 함께 제어한다 (F-4, F-5) */
function applyVisibility(element: HTMLElement, settleT: number) {
  element.style.opacity = String(settleT);
  // settleT가 0(워프 중)이면 화면에 보이지 않는데도 앵커/버튼이 탭 순서에는 남는다.
  // display:none은 레이아웃을 흔들고 no-JS/크롤러 보장을 해치므로 visibility로만 뺀다.
  element.style.visibility = settleT === 0 ? 'hidden' : 'visible';
}

/** 마우스 추적 감쇠 계수 */
const EASING = 0.045;
/** 리사이즈 디바운스(ms) */
const RESIZE_DEBOUNCE = 150;

export function createCosmos(
  canvas: HTMLCanvasElement,
  params: CosmosParams,
  callbacks: CosmosCallbacks,
): CosmosHandle {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      start() {}, stop() {}, destroy() {}, enter() {},
      setNodes() {}, setCoreElement() {}, setPaused() {}, drag() {}, aim() {},
    };
  }

  const renderer = createRenderer(ctx);
  let viewport: Viewport = { width: 0, height: 0 };
  let layers: StarLayer[] = [];
  const warpStars: WarpStar[] = createWarpStars(params.warpStarCount);
  let nodes: StageNode[] = [];
  let coreElement: HTMLElement | null = null;
  let phaseState: PhaseState = createPhaseState(params.skipIntro);
  let rotation: RotationState = createRotation(params);
  let paused = false;
  let frameId: number | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let lastFront: string | null | undefined = undefined;
  let lastPhase: Phase | null = null;
  let lastEnterVisible: boolean | null = null;

  const target = { x: 0, y: 0 };
  const state: RenderState = {
    time: 0,
    mouse: { x: 0, y: 0 },
    cursor: { x: 0, y: 0 },
    pointerActive: false,
    settleT: phaseState.settleT,
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, params.dprCap);
    viewport = { width: rect.width, height: rect.height };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 배경 별의 좌표는 0~1로 정규화되어 있어 리사이즈에도 재생성이 필요 없다
    if (layers.length === 0) layers = createLayers(params.starCount);
  }

  function placeNodes() {
    if (viewport.width === 0) return;
    const positions = orbitPositions(nodes, rotation.angle, viewport, phaseState.settleT);

    for (const p of positions) {
      const node = nodes.find((n) => n.id === p.id);
      if (!node) continue;
      // React 상태를 거치지 않고 DOM에 직접 쓴다. 리렌더가 발생하지 않는다.
      node.element.style.transform =
        `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) scale(${p.scale.toFixed(3)})`;
      applyVisibility(node.element, phaseState.settleT);
      node.element.style.zIndex = String(Math.round(p.depth * 10) + 20);
    }

    const front = frontMostId(positions);
    // 값이 바뀔 때만 알린다. 매 프레임 알리면 React가 매 프레임 리렌더된다.
    if (front !== lastFront) {
      lastFront = front;
      callbacks.onFront(front);
    }
  }

  /** 중심 항성(코어)도 별과 같은 settleT로 점화된다 — 워프 중에는 숨고 조작도 받지 않는다 */
  function placeCore() {
    if (coreElement) applyVisibility(coreElement, phaseState.settleT);
  }

  function notifyPhase() {
    if (phaseState.phase !== lastPhase) {
      lastPhase = phaseState.phase;
      callbacks.onPhase(phaseState.phase);
    }
    const visible = isEnterButtonVisible(phaseState);
    if (visible !== lastEnterVisible) {
      lastEnterVisible = visible;
      callbacks.onEnterVisible(visible);
    }
  }

  function frame() {
    state.time += 1;
    state.mouse.x += (target.x - state.mouse.x) * EASING;
    state.mouse.y += (target.y - state.mouse.y) * EASING;

    phaseState = advancePhase(phaseState);
    state.settleT = phaseState.settleT;

    if (phaseState.phase !== 'orbit') {
      const speed = phaseState.phase === 'warp'
        ? params.warpSpeed
        : params.warpSpeed * (1 - phaseState.settleT);
      for (const star of warpStars) advanceWarpStar(star, speed);
    }

    if (phaseState.phase === 'orbit') {
      rotation = advanceRotation(rotation, params, paused);
    }

    renderer.draw({
      layers,
      warpStars,
      state,
      params,
      viewport,
      phase: phaseState.phase,
      occupiedRings: new Set(nodes.map((n) => n.ring)),
    });
    placeNodes();
    placeCore();
    notifyPhase();

    // 모션 감소 설정에서는 계속 돌리지 않는다. 조작이 있을 때만 다시 그린다.
    // target이 남아 있으면 paused여도 advanceRotation이 매 프레임 소모하므로
    // (F-1) 여기서도 paused와 무관하게 target만 보면 된다. target은 ~78프레임 안에
    // 반드시 null로 수렴하므로 루프가 무한히 예약되지는 않는다.
    const keepGoing =
      params.animate || phaseState.phase !== 'orbit' || rotation.target !== null;
    frameId = keepGoing && !destroyed ? requestAnimationFrame(frame) : null;
  }

  /** 루프가 멈춰 있으면 한 프레임만 다시 그린다 */
  function requestFrame() {
    if (destroyed || frameId !== null) return;
    // start() 전에 setNodes/enter/drag/aim이 루프를 먼저 깨울 수 있다.
    // 이 경로에서도 뷰포트를 잡아두지 않으면 0x0에 영원히 고정된다.
    if (viewport.width === 0) resize();
    frame();
  }

  function handlePointerMove(event: PointerEvent) {
    target.x = event.clientX / window.innerWidth - 0.5;
    target.y = event.clientY / window.innerHeight - 0.5;
    state.cursor.x = event.clientX;
    state.cursor.y = event.clientY;
    state.pointerActive = true;
  }

  function handleResize() {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      resize();
      requestFrame();
    }, RESIZE_DEBOUNCE);
  }

  function handleVisibility() {
    if (document.visibilityState === 'hidden') stop();
    else if (!destroyed) requestFrame();
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

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibility);

  return {
    start,
    stop,
    enter() {
      phaseState = requestEnter(phaseState);
      notifyPhase();
      requestFrame();
    },
    setNodes(next) {
      nodes = next;
      placeNodes();
      requestFrame();
    },
    setCoreElement(element) {
      coreElement = element;
      placeCore();
    },
    setPaused(next) {
      paused = next;
      if (!next) requestFrame();
    },
    drag(deltaX) {
      rotation = dragRotation(rotation, deltaX, params);
      placeNodes();
      requestFrame();
    },
    aim(id) {
      const slot = nodes.find((n) => n.id === id);
      if (!slot) return;
      rotation = aimAt(rotation, slot);
      requestFrame();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    },
  };
}
