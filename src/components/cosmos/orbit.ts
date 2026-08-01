import type { Viewport } from './field';
import type { CosmosParams } from './params';

export type OrbitSlot = {
  id: string;
  /** 0 = 안쪽(프로젝트), 1 = 바깥(채널), 2 = 프로젝트가 넘칠 때의 추가 궤도 */
  ring: number;
  baseAngle: number;
};

export type OrbitPosition = {
  id: string;
  x: number;
  y: number;
  /** -1이 가장 뒤, 1이 가장 앞(관측자 쪽) */
  depth: number;
  scale: number;
};

const TAU = Math.PI * 2;
/** 궤도 반경 비율. 인덱스가 곧 ring 번호다 */
const RING_RATIO = [0.3, 0.43, 0.2];
/** 타원의 세로 납작함. 1이면 정원이고 작을수록 눕는다. renderer.ts가 궤도선을 그릴 때도 이 값을 쓴다 */
export const Y_RATIO = 0.34;
/**
 * 궤도 중심의 세로 위치 비율 (뷰포트 높이 기준).
 * renderer.ts(궤도선)와 CoreStar.tsx(중심 항성 위치)도 이 값에 맞춰야 한다.
 */
export const CENTER_Y_RATIO = 0.46;
/** 한 궤도가 감당하는 최대 개수. 넘으면 궤도를 하나 더 쓴다 */
const MAX_PER_RING = 10;

function spread(ids: string[], ring: number, offset: number): OrbitSlot[] {
  return ids.map((id, i) => ({
    id,
    ring,
    baseAngle: (i / ids.length) * TAU + offset,
  }));
}

export function assignSlots(projectIds: string[], channelIds: string[]): OrbitSlot[] {
  const slots: OrbitSlot[] = [];

  if (projectIds.length > MAX_PER_RING) {
    // 한 궤도에 몰아넣으면 정면에서 겹친다. 안쪽으로 궤도를 하나 더 판다.
    const half = Math.ceil(projectIds.length / 2);
    slots.push(...spread(projectIds.slice(0, half), 0, 0));
    slots.push(...spread(projectIds.slice(half), 2, 0.4));
  } else if (projectIds.length > 0) {
    slots.push(...spread(projectIds, 0, 0));
  }

  if (channelIds.length > 0) {
    slots.push(...spread(channelIds, 1, 0.6));
  }

  return slots;
}

export function ringRadii(viewport: Viewport): number[] {
  const unit = Math.min(viewport.width, viewport.height * 2.2);
  return RING_RATIO.map((r) => unit * r);
}

export function orbitPositions(
  slots: OrbitSlot[],
  rotation: number,
  viewport: Viewport,
  settleT: number,
): OrbitPosition[] {
  const cx = viewport.width / 2;
  const cy = viewport.height * CENTER_Y_RATIO;
  const radii = ringRadii(viewport);
  const spreadOut = 1 - settleT;
  const farDistance = Math.max(viewport.width, viewport.height) * 1.1;

  return slots.map((slot, i) => {
    const angle = slot.baseAngle + rotation;
    const radius = radii[slot.ring] ?? radii[0];
    const depth = Math.sin(angle);
    const targetX = cx + Math.cos(angle) * radius;
    const targetY = cy + depth * radius * Y_RATIO;

    // 감속 구간에서는 화면 밖 먼 곳에서 궤도 자리로 빨려 들어온다
    const escapeAngle = (i / Math.max(slots.length, 1)) * TAU;
    const farX = cx + Math.cos(escapeAngle) * farDistance;
    const farY = cy + Math.sin(escapeAngle) * farDistance;

    return {
      id: slot.id,
      x: targetX + (farX - targetX) * spreadOut,
      y: targetY + (farY - targetY) * spreadOut,
      depth,
      scale: 0.62 + 0.38 * ((depth + 1) / 2),
    };
  });
}

export function frontMostId(positions: OrbitPosition[]): string | null {
  if (positions.length === 0) return null;
  return positions.reduce((best, p) => (p.depth > best.depth ? p : best)).id;
}

export type RotationState = {
  angle: number;
  velocity: number;
  /** 정면 정렬 목표 각도. null이면 자유 회전 */
  target: number | null;
};

/** 목표에 다가가는 감쇠 계수 */
const AIM_EASING = 0.09;
/** 목표에 이 정도까지 붙으면 도착으로 본다 */
const AIM_EPSILON = 0.002;
/** 관성이 기본 속도로 되돌아가는 감쇠 계수 */
const INERTIA_DECAY = 0.03;
/** 드래그 1px당 회전량 */
const DRAG_TO_ANGLE = 0.004;
/** 드래그 1px당 남는 관성 */
const DRAG_TO_VELOCITY = 0.0009;
/** 정면으로 보는 각도. 타원의 아래쪽 끝이며 sin이 최대인 지점이다 */
const FRONT_ANGLE = Math.PI / 2;

export function createRotation(params: CosmosParams): RotationState {
  return { angle: 0, velocity: params.autoRotate, target: null };
}

export function advanceRotation(
  state: RotationState,
  params: CosmosParams,
  paused: boolean,
): RotationState {
  // 조준(aim)은 사용자가 클릭으로 명시적으로 요청한 이동이므로,
  // 패널이 열려 paused가 되어도 끝까지 진행되어야 한다.
  // paused는 자동 회전·관성 같은 "배경 움직임"만 멈추는 것이지,
  // 사용자가 요청한 이동까지 막아서는 안 된다.
  if (state.target !== null) {
    const angle = state.angle + (state.target - state.angle) * AIM_EASING;
    if (Math.abs(state.target - angle) < AIM_EPSILON) {
      return { angle: state.target, velocity: params.autoRotate, target: null };
    }
    return { ...state, angle };
  }

  if (paused) return state;

  if (!params.inertia) {
    return { ...state, angle: state.angle + params.autoRotate, velocity: 0 };
  }

  return {
    angle: state.angle + state.velocity,
    velocity: state.velocity + (params.autoRotate - state.velocity) * INERTIA_DECAY,
    target: null,
  };
}

export function dragRotation(
  state: RotationState,
  deltaX: number,
  params: CosmosParams,
): RotationState {
  return {
    angle: state.angle + deltaX * DRAG_TO_ANGLE,
    velocity: params.inertia ? deltaX * DRAG_TO_VELOCITY : 0,
    target: null,
  };
}

/** 지정한 슬롯이 정면에 오도록 목표 각도를 세운다 */
export function aimAt(state: RotationState, slot: OrbitSlot): RotationState {
  const want = FRONT_ANGLE - slot.baseAngle;
  // 한 바퀴 돌지 않고 가까운 쪽으로 돌린다
  const delta = (((want - state.angle + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  return { ...state, target: state.angle + delta, velocity: 0 };
}

export function isSettled(state: RotationState): boolean {
  return state.target === null;
}
