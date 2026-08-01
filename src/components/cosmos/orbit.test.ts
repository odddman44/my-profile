import { describe, expect, it } from 'vitest';
import { assignSlots, frontMostId, orbitPositions, ringRadii } from './orbit';

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
