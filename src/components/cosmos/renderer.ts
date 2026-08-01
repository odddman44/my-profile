import {
  applyGravity,
  parallaxOffset,
  starPosition,
  type StarLayer,
  type Vec2,
  type Viewport,
} from './field';
import { NEBULA_BLOBS, blobFrame } from './nebula';
import type { CosmosParams } from './params';
import { projectWarpStar, type WarpStar } from './warp';
import { ringRadii } from './orbit';
import type { Phase } from '@/types';

export type RenderState = {
  time: number;
  mouse: Vec2;
  cursor: Vec2;
  pointerActive: boolean;
  /** 감속 진행도 0~1. 워프와 성좌의 교차 페이드에 쓴다 */
  settleT: number;
};

export type DrawInput = {
  layers: StarLayer[];
  warpStars: WarpStar[];
  state: RenderState;
  params: CosmosParams;
  viewport: Viewport;
  phase: Phase;
};

const BACKGROUND = '#03040a';
/** 성운 캐시 해상도. 흐릿한 그라데이션이라 1/4로 줄여도 차이가 보이지 않는다 */
const NEBULA_SCALE = 0.25;
/** 성운 캐시 갱신 주기(프레임). 아주 느리게 움직이므로 매 프레임 다시 그릴 필요가 없다 */
const NEBULA_INTERVAL = 3;

export function createRenderer(ctx: CanvasRenderingContext2D) {
  // 전체 화면 크기의 radial gradient 4장을 매 프레임 새로 만드는 비용을 피하기 위해
  // 저해상도 오프스크린에 그려두고 확대해 합성한다.
  const cache = document.createElement('canvas');
  const cacheCtx = cache.getContext('2d');
  let cacheFrame = -1;

  function paintBlobs(
    target: CanvasRenderingContext2D,
    state: RenderState,
    params: CosmosParams,
    viewport: Viewport,
    scale: number,
  ) {
    target.globalCompositeOperation = 'lighter';
    for (const blob of NEBULA_BLOBS) {
      const frame = blobFrame(blob, state.time, viewport);
      const x = frame.x * scale;
      const y = frame.y * scale;
      const radius = frame.radius * scale;
      const gradient = target.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${blob.color},${0.26 * params.nebulaIntensity})`);
      gradient.addColorStop(0.45, `rgba(${blob.color},${0.09 * params.nebulaIntensity})`);
      gradient.addColorStop(1, `rgba(${blob.color},0)`);
      target.fillStyle = gradient;
      target.beginPath();
      target.arc(x, y, radius, 0, Math.PI * 2);
      target.fill();
    }
    target.globalCompositeOperation = 'source-over';
  }

  function drawNebula(state: RenderState, params: CosmosParams, viewport: Viewport) {
    if (params.nebulaIntensity <= 0) return;

    // 오프스크린을 못 만드는 환경에서는 메인 캔버스에 직접 그린다
    if (!cacheCtx) {
      paintBlobs(ctx, state, params, viewport, 1);
      return;
    }

    const width = Math.max(1, Math.round(viewport.width * NEBULA_SCALE));
    const height = Math.max(1, Math.round(viewport.height * NEBULA_SCALE));

    if (cache.width !== width || cache.height !== height) {
      cache.width = width;
      cache.height = height;
      cacheFrame = -1;
    }

    if (cacheFrame < 0 || state.time - cacheFrame >= NEBULA_INTERVAL) {
      cacheCtx.clearRect(0, 0, width, height);
      paintBlobs(cacheCtx, state, params, viewport, NEBULA_SCALE);
      cacheFrame = state.time;
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(cache, 0, 0, viewport.width, viewport.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawStars(
    layers: StarLayer[],
    state: RenderState,
    params: CosmosParams,
    viewport: Viewport,
    alpha: number,
  ) {
    const useGravity = params.gravity && state.pointerActive;

    for (const layer of layers) {
      const offset = parallaxOffset(layer.depth, state.mouse, params, viewport);
      // 가까운 레이어에만 중력을 적용한다. 전체에 걸면 산만해진다.
      const gravityLayer = useGravity && layer.depth > 0.5;

      for (const star of layer.stars) {
        let { x, y } = starPosition(star, layer, state.time, offset, viewport);
        let stretch = 1;
        let angle = 0;

        if (gravityLayer) {
          const result = applyGravity({ x, y }, state.cursor, params.gravityRadius);
          x = result.x;
          y = result.y;
          stretch = result.stretch;
          angle = result.angle;
        }

        const twinkle = 0.62 + 0.38 * Math.sin(state.time * star.twinkleSpeed + star.twinklePhase);
        ctx.globalAlpha = star.alpha * twinkle * alpha;
        ctx.fillStyle = '#e6ecff';
        ctx.beginPath();
        if (stretch > 1.02) {
          ctx.ellipse(x, y, star.size * stretch, star.size, angle, 0, Math.PI * 2);
        } else {
          ctx.arc(x, y, star.size, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawWarp(warpStars: WarpStar[], viewport: Viewport, alpha: number) {
    if (alpha <= 0.01) return;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#e6ecff';
    for (const star of warpStars) {
      const p = projectWarpStar(star, viewport);
      ctx.globalAlpha = Math.min(1, p.near * 2.2) * alpha;
      ctx.lineWidth = 0.4 + p.near * 1.8;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawOrbitRings(viewport: Viewport, alpha: number) {
    if (alpha <= 0.01) return;
    const cx = viewport.width / 2;
    const cy = viewport.height * 0.46;
    ctx.globalAlpha = alpha * 0.1;
    ctx.strokeStyle = 'rgba(160,180,255,1)';
    ctx.lineWidth = 1;
    for (const radius of ringRadii(viewport)) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius, radius * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  return {
    draw({ layers, warpStars, state, params, viewport, phase }: DrawInput) {
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      if (phase === 'warp') {
        drawNebula(state, params, viewport);
        drawWarp(warpStars, viewport, 1);
        return;
      }

      // 감속 구간에서는 워프가 사라지며 성좌가 떠오른다. 컷 없이 이어지게 만드는 지점이다.
      const settled = state.settleT;
      drawNebula(state, params, viewport);
      if (settled < 1) drawWarp(warpStars, viewport, 1 - settled);
      drawStars(layers, state, params, viewport, settled);
      drawOrbitRings(viewport, settled);
    },
  };
}
