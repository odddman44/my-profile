import type { CosmosParams } from './params';

export type Star = {
  /** 0~1로 정규화된 x 좌표 (home x) */
  hx: number;
  hy: number;
  size: number;
  alpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
};

export type StarLayer = {
  /** 0에 가까울수록 멀다. 시차 이동량의 배수로 쓰인다 */
  depth: number;
  /** 마우스와 무관한 자체 표류 속도 */
  drift: number;
  stars: Star[];
};

export type Vec2 = { x: number; y: number };
export type Viewport = { width: number; height: number };

type LayerSpec = {
  ratio: number;
  depth: number;
  drift: number;
  size: [number, number];
  alpha: [number, number];
};

const LAYER_SPECS: LayerSpec[] = [
  { ratio: 0.6, depth: 0.1, drift: 0.0018, size: [0.4, 0.9], alpha: [0.2, 0.45] },
  { ratio: 0.28, depth: 0.34, drift: 0.0042, size: [0.7, 1.4], alpha: [0.4, 0.75] },
  { ratio: 0.12, depth: 0.78, drift: 0.009, size: [1.1, 2.2], alpha: [0.7, 1.0] },
];

/** 시차 이동량 계수. 화면 크기 대비 최대 이동 비율 */
const PARALLAX_SCALE = 0.55;
/** 스크롤 1px당 이동량 */
const SCROLL_SCALE = 0.12;
/** 프레임당 표류량 배수. 눈치채지 못할 만큼 느려야 한다 */
const DRIFT_SCALE = 0.0012;

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export function createLayers(starCount: number, random: () => number = Math.random): StarLayer[] {
  let assigned = 0;

  return LAYER_SPECS.map((spec, index) => {
    // 마지막 레이어는 나머지를 전부 가져간다. 반올림 오차로 총합이 어긋나지 않게 한다.
    const isLast = index === LAYER_SPECS.length - 1;
    const count = isLast ? starCount - assigned : Math.round(starCount * spec.ratio);
    assigned += count;

    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        hx: random(),
        hy: random(),
        size: lerp(spec.size[0], spec.size[1], random()),
        alpha: lerp(spec.alpha[0], spec.alpha[1], random()),
        twinklePhase: random() * Math.PI * 2,
        twinkleSpeed: lerp(0.006, 0.028, random()),
      });
    }

    return { depth: spec.depth, drift: spec.drift, stars };
  });
}

/**
 * 레이어 하나의 시차 오프셋을 구한다.
 * mouse는 화면 중앙 기준 -0.5~0.5 범위의 정규화 좌표다.
 */
export function parallaxOffset(
  depth: number,
  mouse: Vec2,
  scrollY: number,
  params: CosmosParams,
  viewport: Viewport,
): Vec2 {
  const mouseFactor = depth * PARALLAX_SCALE * params.mouseParallax;
  const scrollFactor = depth * SCROLL_SCALE * params.scrollParallax;

  return {
    x: mouse.x * viewport.width * mouseFactor,
    y: mouse.y * viewport.height * mouseFactor + scrollY * scrollFactor,
  };
}

/** 화면 밖으로 밀려난 별을 반대편에서 다시 등장시킨다 */
export function wrap(value: number, max: number): number {
  if (max <= 0) return 0;
  return ((value % max) + max) % max;
}

/**
 * 특정 시점에 별이 실제로 그려질 좌표를 구한다.
 * 시차 오프셋과 별개로 아주 느린 자체 표류를 더한다 —
 * 마우스를 떼도 배경이 정지 화면이 되지 않게 하는 장치다.
 */
export function starPosition(
  star: Star,
  layer: StarLayer,
  time: number,
  offset: Vec2,
  viewport: Viewport,
): Vec2 {
  const drifted = star.hx + layer.drift * time * DRIFT_SCALE;

  return {
    x: wrap(drifted * viewport.width - offset.x, viewport.width),
    y: wrap(star.hy * viewport.height - offset.y, viewport.height),
  };
}

export type GravityResult = Vec2 & {
  /** 별을 길게 늘이는 배율. 1이면 변형 없음 */
  stretch: number;
  /** 늘어나는 축의 각도(라디안) */
  angle: number;
};

const MAX_PULL = 26;
const TANGENT_RATIO = 0.85;
const MAX_STRETCH = 3.4;

/**
 * 커서를 질량으로 삼아 반경 안의 별을 끌어당기고 휘게 만든다.
 * 인력만 쓰면 별이 커서로 직진해 빨려드는 것처럼 보이므로,
 * 수직 방향 접선 성분을 섞어 궤도를 도는 듯한 궤적을 만든다.
 */
export function applyGravity(point: Vec2, cursor: Vec2, radius: number): GravityResult {
  const dx = cursor.x - point.x;
  const dy = cursor.y - point.y;
  const distance = Math.hypot(dx, dy);

  if (distance >= radius) {
    return { x: point.x, y: point.y, stretch: 1, angle: 0 };
  }

  // 0으로 나누는 것을 막고, 커서와 겹친 별이 튀는 것도 함께 막는다
  const safeDistance = Math.max(distance, 1);
  const falloff = 1 - distance / radius;
  const pull = falloff * falloff * MAX_PULL;

  const nx = dx / safeDistance;
  const ny = dy / safeDistance;

  const x = point.x + nx * pull - ny * pull * TANGENT_RATIO;
  const y = point.y + ny * pull + nx * pull * TANGENT_RATIO;

  const stretch = Math.min(MAX_STRETCH, 1 + falloff * falloff * (MAX_STRETCH - 1));
  const angle = Math.atan2(cursor.y - y, cursor.x - x) + Math.PI / 2;

  return { x, y, stretch, angle };
}
