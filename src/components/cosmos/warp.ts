import type { Viewport } from './field';

export type WarpStar = {
  /** -1~1 정규화된 가로 위치 */
  x: number;
  y: number;
  /** 관측자까지의 거리. 1이 가장 멀고 0에 가까울수록 눈앞이다 */
  z: number;
  /** 직전 프레임의 z. 잔상 선의 시작점을 구하는 데 쓴다 */
  pz: number;
};

/** 이보다 가까워지면 관측자를 지나친 것으로 보고 먼 곳에서 다시 태어난다 */
const RECYCLE_Z = 0.015;
/** 투영 배율. 화면 짧은 변에 비례한다 */
const FOV_RATIO = 0.9;

export function createWarpStars(count: number, random: () => number = Math.random): WarpStar[] {
  const stars: WarpStar[] = [];
  for (let i = 0; i < count; i++) {
    const z = random() || 1;
    stars.push({ x: (random() - 0.5) * 2, y: (random() - 0.5) * 2, z, pz: z });
  }
  return stars;
}

export function advanceWarpStar(
  star: WarpStar,
  speed: number,
  random: () => number = Math.random,
): void {
  star.pz = star.z;
  star.z -= speed;

  if (star.z <= RECYCLE_Z) {
    star.z = 1;
    star.pz = 1;
    // 같은 자리에서 다시 나오면 화면에 줄무늬가 생긴다
    star.x = (random() - 0.5) * 2;
    star.y = (random() - 0.5) * 2;
  }
}

export function projectWarpStar(star: WarpStar, viewport: Viewport) {
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  const fov = Math.min(viewport.width, viewport.height) * FOV_RATIO;
  const z = Math.max(star.z, RECYCLE_Z);
  const pz = Math.max(star.pz, RECYCLE_Z);

  return {
    x: cx + (star.x / z) * fov,
    y: cy + (star.y / z) * fov,
    px: cx + (star.x / pz) * fov,
    py: cy + (star.y / pz) * fov,
    near: 1 - z,
  };
}
