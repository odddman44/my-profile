import { describe, expect, it } from 'vitest';
import { resolveParams } from './params';

const desktop = { hasFinePointer: true, prefersReducedMotion: false };
const mobile = { hasFinePointer: false, prefersReducedMotion: false };
const reduced = { hasFinePointer: true, prefersReducedMotion: true };

describe('resolveParams', () => {
  it('데스크톱에서는 별 620개와 중력 렌즈를 사용한다', () => {
    const params = resolveParams(desktop);
    expect(params.starCount).toBe(620);
    expect(params.gravity).toBe(true);
    expect(params.mouseParallax).toBe(1);
    expect(params.dprCap).toBe(2);
  });

  it('포인터가 없으면 별을 260개로 줄이고 중력과 마우스 시차를 끈다', () => {
    const params = resolveParams(mobile);
    expect(params.starCount).toBe(260);
    expect(params.gravity).toBe(false);
    expect(params.mouseParallax).toBe(0);
    expect(params.dprCap).toBe(1.5);
  });

  it('모션 감소 설정에서는 애니메이션을 끈다', () => {
    const params = resolveParams(reduced);
    expect(params.animate).toBe(false);
  });

  it('모션 감소 설정에서는 모든 움직임 파라미터가 0이 된다', () => {
    const params = resolveParams(reduced);
    expect(params.mouseParallax).toBe(0);
    expect(params.gravity).toBe(false);
  });

  it('모션 감소 설정에서도 별과 성운은 그린다', () => {
    // 정적인 우주 사진 한 장은 남아야 한다
    const params = resolveParams(reduced);
    expect(params.starCount).toBeGreaterThan(0);
    expect(params.nebulaIntensity).toBeGreaterThan(0);
  });

  it('데스크톱에서는 워프 오프닝과 자동 회전을 사용한다', () => {
    const params = resolveParams(desktop);
    expect(params.skipIntro).toBe(false);
    expect(params.autoRotate).toBeGreaterThan(0);
    expect(params.inertia).toBe(true);
    expect(params.warpStarCount).toBe(420);
  });

  it('포인터가 없으면 워프 별을 줄인다', () => {
    expect(resolveParams(mobile).warpStarCount).toBe(200);
  });

  it('모션 감소 설정에서는 오프닝을 건너뛰고 자동 회전과 관성을 끈다', () => {
    const params = resolveParams(reduced);
    expect(params.skipIntro).toBe(true);
    expect(params.autoRotate).toBe(0);
    expect(params.inertia).toBe(false);
  });
});
