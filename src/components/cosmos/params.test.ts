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

  it('포인터가 없어도 스크롤 시차는 유지한다', () => {
    // 모바일에서 공간감을 만드는 유일한 인터랙션이 스크롤이다
    expect(resolveParams(mobile).scrollParallax).toBe(1);
  });

  it('모션 감소 설정에서는 애니메이션을 끈다', () => {
    const params = resolveParams(reduced);
    expect(params.animate).toBe(false);
  });

  it('모션 감소 설정에서는 모든 움직임 파라미터가 0이 된다', () => {
    const params = resolveParams(reduced);
    expect(params.mouseParallax).toBe(0);
    expect(params.scrollParallax).toBe(0);
    expect(params.gravity).toBe(false);
  });

  it('모션 감소 설정에서도 별과 성운은 그린다', () => {
    // 정적인 우주 사진 한 장은 남아야 한다
    const params = resolveParams(reduced);
    expect(params.starCount).toBeGreaterThan(0);
    expect(params.nebulaIntensity).toBeGreaterThan(0);
  });
});
