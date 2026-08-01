import type { Viewport } from './field';

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
/** 타원의 세로 납작함. 1이면 정원이고 작을수록 눕는다 */
const Y_RATIO = 0.34;
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
  const cy = viewport.height * 0.46;
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
