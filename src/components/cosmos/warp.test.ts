import { describe, expect, it } from 'vitest';
import { advanceWarpStar, createWarpStars, projectWarpStar } from './warp';

const half = () => 0.5;
const viewport = { width: 1000, height: 800 };

describe('createWarpStars', () => {
  it('요청한 개수를 만든다', () => {
    expect(createWarpStars(420, half)).toHaveLength(420);
  });

  it('z는 0보다 크고 1 이하다', () => {
    for (const s of createWarpStars(200, Math.random)) {
      expect(s.z).toBeGreaterThan(0);
      expect(s.z).toBeLessThanOrEqual(1);
    }
  });

  it('x와 y는 -1에서 1 사이다', () => {
    for (const s of createWarpStars(200, Math.random)) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(s.y)).toBeLessThanOrEqual(1);
    }
  });
});

describe('advanceWarpStar', () => {
  it('z가 줄어든다 — 관측자에게 다가온다', () => {
    const s = { x: 0.5, y: 0.5, z: 0.8, pz: 0.8 };
    advanceWarpStar(s, 0.022, half);
    expect(s.z).toBeLessThan(0.8);
  });

  it('직전 z를 pz에 남긴다 — 잔상 선을 그으려면 필요하다', () => {
    const s = { x: 0.5, y: 0.5, z: 0.8, pz: 0.8 };
    advanceWarpStar(s, 0.022, half);
    expect(s.pz).toBe(0.8);
  });

  it('관측자를 지나치면 먼 곳에서 다시 태어난다', () => {
    const s = { x: 0.5, y: 0.5, z: 0.02, pz: 0.02 };
    advanceWarpStar(s, 0.022, half);
    expect(s.z).toBe(1);
    expect(s.pz).toBe(1);
  });

  it('다시 태어날 때 위치가 새로 뽑힌다', () => {
    // 같은 자리에서 계속 나오면 화면에 줄무늬가 생긴다
    const s = { x: 0.9, y: 0.9, z: 0.01, pz: 0.01 };
    advanceWarpStar(s, 0.022, () => 0.25);
    expect(s.x).toBeCloseTo(-0.5, 5);
    expect(s.y).toBeCloseTo(-0.5, 5);
  });

  it('속도가 0이면 멈춘다 — 감속의 끝에서 필요하다', () => {
    const s = { x: 0.5, y: 0.5, z: 0.8, pz: 0.8 };
    advanceWarpStar(s, 0, half);
    expect(s.z).toBe(0.8);
  });
});

describe('projectWarpStar', () => {
  it('가까울수록 화면 중심에서 멀어진다', () => {
    const far = projectWarpStar({ x: 0.5, y: 0, z: 0.9, pz: 0.9 }, viewport);
    const near = projectWarpStar({ x: 0.5, y: 0, z: 0.2, pz: 0.2 }, viewport);
    expect(Math.abs(near.x - viewport.width / 2)).toBeGreaterThan(
      Math.abs(far.x - viewport.width / 2),
    );
  });

  it('가까울수록 near 값이 크다', () => {
    expect(projectWarpStar({ x: 0.3, y: 0.3, z: 0.1, pz: 0.2 }, viewport).near).toBeGreaterThan(
      projectWarpStar({ x: 0.3, y: 0.3, z: 0.9, pz: 1 }, viewport).near,
    );
  });

  it('항상 유한한 좌표를 낸다', () => {
    const p = projectWarpStar({ x: 1, y: 1, z: 0.001, pz: 0.002 }, viewport);
    for (const v of [p.x, p.y, p.px, p.py]) expect(Number.isFinite(v)).toBe(true);
  });
});
