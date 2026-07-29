import { describe, expect, it } from 'vitest';
import { createLayers, parallaxOffset, starPosition, wrap } from './field';
import { resolveParams } from './params';

/** 결정적 테스트를 위한 가짜 난수 — 항상 0.5를 반환한다 */
const half = () => 0.5;

describe('createLayers', () => {
  it('요청한 개수만큼 별을 만든다', () => {
    const layers = createLayers(620, half);
    const total = layers.reduce((sum, layer) => sum + layer.stars.length, 0);
    expect(total).toBe(620);
  });

  it('개수가 나누어떨어지지 않아도 총합이 정확하다', () => {
    const total = createLayers(261, half).reduce((sum, l) => sum + l.stars.length, 0);
    expect(total).toBe(261);
  });

  it('깊이가 서로 다른 3개 레이어를 만든다', () => {
    const layers = createLayers(620, half);
    expect(layers).toHaveLength(3);
    const depths = layers.map((l) => l.depth);
    expect(new Set(depths).size).toBe(3);
  });

  it('별 좌표를 0과 1 사이로 정규화한다', () => {
    // 리사이즈 시에도 분포가 유지되려면 픽셀이 아니라 비율로 보관해야 한다
    for (const layer of createLayers(100, Math.random)) {
      for (const star of layer.stars) {
        expect(star.hx).toBeGreaterThanOrEqual(0);
        expect(star.hx).toBeLessThanOrEqual(1);
        expect(star.hy).toBeGreaterThanOrEqual(0);
        expect(star.hy).toBeLessThanOrEqual(1);
      }
    }
  });

  it('먼 레이어일수록 별이 작다', () => {
    const layers = createLayers(620, half);
    expect(layers[0].stars[0].size).toBeLessThan(layers[2].stars[0].size);
  });

  it('별 개수가 0이면 빈 레이어를 만든다', () => {
    const total = createLayers(0, half).reduce((sum, l) => sum + l.stars.length, 0);
    expect(total).toBe(0);
  });
});

describe('parallaxOffset', () => {
  const params = resolveParams({ hasFinePointer: true, prefersReducedMotion: false });
  const viewport = { width: 1000, height: 800 };

  it('깊이가 0이면 움직이지 않는다', () => {
    const offset = parallaxOffset(0, { x: 0.5, y: 0.5 }, 300, params, viewport);
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('마우스가 중앙이고 스크롤이 0이면 오프셋이 0이다', () => {
    const offset = parallaxOffset(0.8, { x: 0, y: 0 }, 0, params, viewport);
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('가까운 레이어가 먼 레이어보다 많이 움직인다', () => {
    const near = parallaxOffset(0.78, { x: 0.4, y: 0 }, 0, params, viewport);
    const far = parallaxOffset(0.1, { x: 0.4, y: 0 }, 0, params, viewport);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
  });

  it('스크롤은 y축만 밀어낸다', () => {
    const offset = parallaxOffset(0.5, { x: 0, y: 0 }, 500, params, viewport);
    expect(offset.x).toBe(0);
    expect(offset.y).not.toBe(0);
  });

  it('마우스 시차가 꺼지면 마우스 입력을 무시한다', () => {
    const mobile = resolveParams({ hasFinePointer: false, prefersReducedMotion: false });
    const offset = parallaxOffset(0.8, { x: 0.5, y: 0.5 }, 0, mobile, viewport);
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('모션 감소 설정에서는 스크롤에도 반응하지 않는다', () => {
    const reduced = resolveParams({ hasFinePointer: true, prefersReducedMotion: true });
    const offset = parallaxOffset(0.8, { x: 0.5, y: 0.5 }, 900, reduced, viewport);
    expect(offset.y).toBe(0);
  });
});

describe('starPosition', () => {
  const viewport = { width: 1000, height: 800 };
  const layer = createLayers(620, half)[2];
  const star = layer.stars[0];
  const noOffset = { x: 0, y: 0 };

  it('마우스 입력이 없어도 시간이 흐르면 위치가 변한다', () => {
    // 자체 표류가 없으면 마우스를 뗀 순간 배경이 정지 화면이 된다
    const first = starPosition(star, layer, 0, noOffset, viewport);
    const later = starPosition(star, layer, 20000, noOffset, viewport);
    expect(later.x).not.toBe(first.x);
  });

  it('오랜 시간이 지나도 화면 안에 머문다', () => {
    for (const time of [0, 50_000, 500_000]) {
      const point = starPosition(star, layer, time, noOffset, viewport);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThan(viewport.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThan(viewport.height);
    }
  });

  it('오프셋만큼 반대로 밀린다', () => {
    const base = starPosition(star, layer, 0, noOffset, viewport);
    const shifted = starPosition(star, layer, 0, { x: 40, y: 0 }, viewport);
    expect(shifted.x).toBeCloseTo(wrap(base.x - 40, viewport.width), 5);
  });
});

describe('wrap', () => {
  it('음수를 반대편으로 돌려보낸다', () => {
    expect(wrap(-10, 100)).toBe(90);
  });

  it('최댓값을 넘으면 처음으로 돌아온다', () => {
    expect(wrap(105, 100)).toBe(5);
  });
});
