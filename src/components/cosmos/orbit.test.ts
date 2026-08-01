import { describe, expect, it } from 'vitest';
import {
  advanceRotation,
  aimAt,
  assignSlots,
  createRotation,
  dragRotation,
  frontMostId,
  isSettled,
  orbitPositions,
  ringRadii,
} from './orbit';
import { resolveParams } from './params';

const viewport = { width: 1200, height: 800 };
const projects = ['todo', 'blog', 'meetup', 'travel'];
const channels = ['github', 'email'];

describe('assignSlots', () => {
  it('모든 항목에 슬롯을 준다', () => {
    expect(assignSlots(projects, channels)).toHaveLength(6);
  });

  it('프로젝트는 안쪽(0번), 채널은 바깥(1번) 궤도에 놓는다', () => {
    const slots = assignSlots(projects, channels);
    for (const id of projects) expect(slots.find((s) => s.id === id)!.ring).toBe(0);
    for (const id of channels) expect(slots.find((s) => s.id === id)!.ring).toBe(1);
  });

  it('같은 궤도 안에서 각도를 균등 분할한다', () => {
    const slots = assignSlots(['a', 'b', 'c', 'd'], []);
    const angles = slots.map((s) => s.baseAngle).sort((x, y) => x - y);
    const gaps = angles.slice(1).map((a, i) => a - angles[i]);
    for (const gap of gaps) expect(gap).toBeCloseTo(Math.PI / 2, 5);
  });

  it('프로젝트가 10개를 넘으면 궤도를 하나 더 쓴다', () => {
    const many = Array.from({ length: 12 }, (_, i) => 'p' + i);
    const rings = new Set(assignSlots(many, []).map((s) => s.ring));
    expect(rings.has(2)).toBe(true);
  });

  it('프로젝트가 10개 이하면 한 궤도만 쓴다', () => {
    const ten = Array.from({ length: 10 }, (_, i) => 'p' + i);
    const rings = new Set(assignSlots(ten, []).map((s) => s.ring));
    expect(rings).toEqual(new Set([0]));
  });

  it('항목이 없어도 예외를 내지 않는다', () => {
    expect(assignSlots([], [])).toEqual([]);
  });
});

describe('ringRadii', () => {
  it('바깥 궤도가 안쪽보다 크다', () => {
    const r = ringRadii(viewport);
    expect(r[1]).toBeGreaterThan(r[0]);
  });

  it('추가 궤도는 안쪽 궤도보다 작다', () => {
    const r = ringRadii(viewport);
    expect(r[2]).toBeLessThan(r[0]);
  });
});

describe('orbitPositions', () => {
  const slots = assignSlots(projects, channels);

  it('슬롯 개수만큼 좌표를 낸다', () => {
    expect(orbitPositions(slots, 0, viewport, 1)).toHaveLength(6);
  });

  it('회전값이 바뀌면 위치도 바뀐다', () => {
    const a = orbitPositions(slots, 0, viewport, 1)[0];
    const b = orbitPositions(slots, 1, viewport, 1)[0];
    expect(a.x).not.toBeCloseTo(b.x, 3);
  });

  it('앞쪽(depth가 큰) 별이 더 크게 그려진다', () => {
    const list = orbitPositions(slots, 0, viewport, 1);
    const front = list.reduce((m, p) => (p.depth > m.depth ? p : m));
    const back = list.reduce((m, p) => (p.depth < m.depth ? p : m));
    expect(front.scale).toBeGreaterThan(back.scale);
  });

  it('depth는 -1과 1 사이다', () => {
    for (const p of orbitPositions(slots, 0.7, viewport, 1)) {
      expect(p.depth).toBeGreaterThanOrEqual(-1);
      expect(p.depth).toBeLessThanOrEqual(1);
    }
  });

  it('감속 중에는 화면 밖 먼 곳에서 시작한다', () => {
    // settleT가 0이면 아직 궤도에 도착하지 않은 상태다
    const far = orbitPositions(slots, 0, viewport, 0)[0];
    const settled = orbitPositions(slots, 0, viewport, 1)[0];
    const cx = viewport.width / 2;
    expect(Math.abs(far.x - cx)).toBeGreaterThan(Math.abs(settled.x - cx));
  });

  it('좌표가 항상 유한하다', () => {
    for (const p of orbitPositions(slots, 3.3, viewport, 0.5)) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});

describe('frontMostId', () => {
  it('depth가 가장 큰 별을 고른다', () => {
    const list = [
      { id: 'a', x: 0, y: 0, depth: -0.5, scale: 1 },
      { id: 'b', x: 0, y: 0, depth: 0.9, scale: 1 },
      { id: 'c', x: 0, y: 0, depth: 0.2, scale: 1 },
    ];
    expect(frontMostId(list)).toBe('b');
  });

  it('비어 있으면 null이다', () => {
    expect(frontMostId([])).toBeNull();
  });
});

const desktopParams = resolveParams({ hasFinePointer: true, prefersReducedMotion: false });
const reducedParams = resolveParams({ hasFinePointer: true, prefersReducedMotion: true });

describe('advanceRotation', () => {
  it('자동 회전이 켜져 있으면 각도가 늘어난다', () => {
    const next = advanceRotation(createRotation(desktopParams), desktopParams, false);
    expect(next.angle).toBeGreaterThan(0);
  });

  it('모션 감소 설정에서는 저절로 돌지 않는다', () => {
    const next = advanceRotation(createRotation(reducedParams), reducedParams, false);
    expect(next.angle).toBe(0);
  });

  it('패널이 열려 있으면 멈춘다 — 움직이는 글씨는 읽을 수 없다', () => {
    const spun = { angle: 1, velocity: 0.05, target: null };
    expect(advanceRotation(spun, desktopParams, true).angle).toBe(1);
  });

  it('관성이 기본 속도로 수렴한다', () => {
    let s = { angle: 0, velocity: 0.08, target: null };
    for (let i = 0; i < 300; i++) s = advanceRotation(s, desktopParams, false);
    expect(s.velocity).toBeCloseTo(desktopParams.autoRotate, 4);
  });

  it('관성이 꺼져 있으면 놓는 즉시 멈춘다', () => {
    const s = advanceRotation({ angle: 0, velocity: 0.08, target: null }, reducedParams, false);
    expect(s.velocity).toBe(0);
  });
});

describe('dragRotation', () => {
  it('끄는 방향으로 각도가 움직인다', () => {
    const s = dragRotation(createRotation(desktopParams), 40, desktopParams);
    expect(s.angle).toBeGreaterThan(0);
  });

  it('반대로 끌면 반대로 움직인다', () => {
    const s = dragRotation(createRotation(desktopParams), -40, desktopParams);
    expect(s.angle).toBeLessThan(0);
  });

  it('드래그하면 정면 정렬 목표가 취소된다', () => {
    const aiming = { angle: 0, velocity: 0, target: 2 };
    expect(dragRotation(aiming, 10, desktopParams).target).toBeNull();
  });

  it('관성이 꺼져 있어도 드래그는 동작한다', () => {
    expect(dragRotation(createRotation(reducedParams), 40, reducedParams).angle).toBeGreaterThan(0);
  });
});

describe('aimAt', () => {
  const slot = { id: 'todo', ring: 0, baseAngle: 0 };

  it('목표를 설정한다', () => {
    expect(aimAt(createRotation(desktopParams), slot).target).not.toBeNull();
  });

  it('목표에 도달하면 그 별이 정면에 온다', () => {
    let s = aimAt(createRotation(desktopParams), slot);
    // 목표에 도달하면(target이 null이 되면) 더 이상 진행할 필요가 없다 —
    // 실제 사용에서도 정렬이 끝나면 패널이 열리며 회전이 멈춘다
    for (let i = 0; i < 400 && s.target !== null; i++) {
      s = advanceRotation(s, desktopParams, false);
    }
    // 정면은 sin이 최대인 지점, 즉 baseAngle + angle === π/2
    expect(Math.sin(slot.baseAngle + s.angle)).toBeCloseTo(1, 2);
  });

  it('한 바퀴 돌지 않고 가까운 쪽으로 돈다', () => {
    // 목표까지의 회전량은 절대 π를 넘지 않아야 한다
    const s = aimAt({ angle: 3, velocity: 0, target: null }, slot);
    expect(Math.abs(s.target! - 3)).toBeLessThanOrEqual(Math.PI + 1e-9);
  });
});

describe('isSettled', () => {
  it('목표가 없으면 안정 상태다', () => {
    expect(isSettled({ angle: 0, velocity: 0, target: null })).toBe(true);
  });

  it('목표가 있으면 아직 아니다', () => {
    expect(isSettled({ angle: 0, velocity: 0, target: 1 })).toBe(false);
  });
});
