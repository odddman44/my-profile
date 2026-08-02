import { describe, expect, it } from 'vitest';
import {
  ENTER_DELAY_FRAMES,
  SETTLE_FRAMES,
  advancePhase,
  createPhaseState,
  isEnterButtonVisible,
  requestEnter,
} from './phase';

/** 상태를 n 프레임 진행시킨다 */
function run(state: ReturnType<typeof createPhaseState>, n: number) {
  let s = state;
  for (let i = 0; i < n; i++) s = advancePhase(s);
  return s;
}

describe('createPhaseState', () => {
  it('기본적으로 워프에서 시작한다', () => {
    const s = createPhaseState(false);
    expect(s.phase).toBe('warp');
    expect(s.settleT).toBe(0);
  });

  it('오프닝을 건너뛰면 성좌에서 시작하고 감속이 이미 끝나 있다', () => {
    const s = createPhaseState(true);
    expect(s.phase).toBe('orbit');
    expect(s.settleT).toBe(1);
  });
});

describe('isEnterButtonVisible', () => {
  it('2초(120프레임) 전에는 보이지 않는다', () => {
    expect(isEnterButtonVisible(run(createPhaseState(false), ENTER_DELAY_FRAMES - 1))).toBe(false);
  });

  it('2초가 지나면 보인다', () => {
    expect(isEnterButtonVisible(run(createPhaseState(false), ENTER_DELAY_FRAMES))).toBe(true);
  });

  it('워프가 아닌 단계에서는 보이지 않는다', () => {
    const entered = requestEnter(run(createPhaseState(false), ENTER_DELAY_FRAMES));
    expect(isEnterButtonVisible(entered)).toBe(false);
  });
});

describe('requestEnter', () => {
  it('워프에서 호출하면 감속으로 넘어간다', () => {
    expect(requestEnter(createPhaseState(false)).phase).toBe('settle');
  });

  it('버튼이 뜨기 전에도 건너뛸 수 있다', () => {
    // 건너뛰기는 워프 내내 눌릴 수 있어야 한다
    expect(requestEnter(createPhaseState(false)).phase).toBe('settle');
  });

  it('이미 성좌면 아무 일도 하지 않는다', () => {
    const orbit = createPhaseState(true);
    expect(requestEnter(orbit)).toEqual(orbit);
  });
});

describe('advancePhase', () => {
  it('워프는 진행해도 단계가 바뀌지 않는다', () => {
    expect(run(createPhaseState(false), 500).phase).toBe('warp');
  });

  it('감속은 진행도가 0에서 1로 오른다', () => {
    const settling = run(requestEnter(createPhaseState(false)), 10);
    expect(settling.settleT).toBeGreaterThan(0);
    expect(settling.settleT).toBeLessThan(1);
  });

  it('감속이 끝나면 성좌가 된다', () => {
    const done = run(requestEnter(createPhaseState(false)), SETTLE_FRAMES + 2);
    expect(done.phase).toBe('orbit');
    expect(done.settleT).toBe(1);
  });

  it('성좌에서는 진행도가 1을 넘지 않는다', () => {
    const done = run(requestEnter(createPhaseState(false)), SETTLE_FRAMES + 200);
    expect(done.settleT).toBe(1);
  });

  it('원래 상태를 변형하지 않는다', () => {
    const s = createPhaseState(false);
    advancePhase(s);
    expect(s.elapsed).toBe(0);
  });
});
