export type CosmosEnvironment = {
  hasFinePointer: boolean;
  prefersReducedMotion: boolean;
};

export type CosmosParams = {
  starCount: number;
  nebulaIntensity: number;
  mouseParallax: number;
  gravity: boolean;
  gravityRadius: number;
  dprCap: number;
  animate: boolean;
  /** 워프 오프닝의 별 개수 */
  warpStarCount: number;
  /** 워프 전진 속도 (z축, 프레임당) */
  warpSpeed: number;
  /** 기본 자동 회전 속도 (라디안/프레임). 0이면 자동 회전 없음 */
  autoRotate: number;
  /** 드래그를 놓았을 때 관성으로 미끄러지는지 */
  inertia: boolean;
  /** 워프 오프닝을 건너뛰고 성좌부터 시작하는지 */
  skipIntro: boolean;
};

const BASE: CosmosParams = {
  starCount: 620,
  nebulaIntensity: 1,
  mouseParallax: 1,
  gravity: true,
  gravityRadius: 170,
  dprCap: 2,
  animate: true,
  warpStarCount: 420,
  warpSpeed: 0.022,
  autoRotate: 0.0022,
  inertia: true,
  skipIntro: false,
};

export function resolveParams(env: CosmosEnvironment): CosmosParams {
  const params = { ...BASE };

  // 호버 포인터가 없으면 마우스 기반 연출이 무의미하고, 모바일 발열·배터리에 직결된다
  if (!env.hasFinePointer) {
    params.starCount = 260;
    params.warpStarCount = 200;
    params.mouseParallax = 0;
    params.gravity = false;
    params.dprCap = 1.5;
  }

  // 워프와 자동 회전은 전정기관 장애가 있는 사용자에게 어지럼증을 유발한다.
  // 사용자가 직접 끄는 드래그는 의도된 움직임이므로 남긴다.
  if (env.prefersReducedMotion) {
    params.animate = false;
    params.skipIntro = true;
    params.autoRotate = 0;
    params.inertia = false;
    params.mouseParallax = 0;
    params.gravity = false;
  }

  return params;
}
