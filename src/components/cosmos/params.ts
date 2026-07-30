export type CosmosEnvironment = {
  hasFinePointer: boolean;
  prefersReducedMotion: boolean;
};

export type CosmosParams = {
  starCount: number;
  nebulaIntensity: number;
  mouseParallax: number;
  scrollParallax: number;
  gravity: boolean;
  gravityRadius: number;
  dprCap: number;
  animate: boolean;
};

const BASE: CosmosParams = {
  starCount: 620,
  nebulaIntensity: 1,
  mouseParallax: 1,
  scrollParallax: 1,
  gravity: true,
  gravityRadius: 170,
  dprCap: 2,
  animate: true,
};

export function resolveParams(env: CosmosEnvironment): CosmosParams {
  const params = { ...BASE };

  // 호버 포인터가 없으면 마우스 기반 연출이 무의미하고, 모바일 발열·배터리에 직결된다.
  // 다만 스크롤 시차는 남긴다 — 터치 환경에서 공간감을 만드는 유일한 입력이다.
  if (!env.hasFinePointer) {
    params.starCount = 260;
    params.mouseParallax = 0;
    params.gravity = false;
    params.dprCap = 1.5;
  }

  // 시차와 중력 왜곡은 전정기관 장애가 있는 사용자에게 어지럼증을 유발할 수 있다.
  // 움직임만 멈추고 정적인 화면은 남긴다.
  if (env.prefersReducedMotion) {
    params.animate = false;
    params.mouseParallax = 0;
    params.scrollParallax = 0;
    params.gravity = false;
  }

  return params;
}
