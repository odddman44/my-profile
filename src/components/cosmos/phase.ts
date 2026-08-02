import type { Phase } from '@/types';

export type PhaseState = {
  phase: Phase;
  /** 현재 단계에 들어온 뒤 경과한 프레임 */
  elapsed: number;
  /** 감속 진행도 0~1 */
  settleT: number;
};

/** 진입 버튼이 뜨는 시점. 60fps 기준 2.0초 */
export const ENTER_DELAY_FRAMES = 120;
/** 감속에 걸리는 시간. 60fps 기준 1.6초 */
export const SETTLE_FRAMES = 96;

export function createPhaseState(skipIntro: boolean): PhaseState {
  if (skipIntro) return { phase: 'orbit', elapsed: 0, settleT: 1 };
  return { phase: 'warp', elapsed: 0, settleT: 0 };
}

export function isEnterButtonVisible(state: PhaseState): boolean {
  return state.phase === 'warp' && state.elapsed >= ENTER_DELAY_FRAMES;
}

/** 워프에서 감속으로 넘긴다. 진입 버튼과 건너뛰기 모두 이 함수를 쓴다 */
export function requestEnter(state: PhaseState): PhaseState {
  if (state.phase !== 'warp') return state;
  return { phase: 'settle', elapsed: 0, settleT: 0 };
}

export function advancePhase(state: PhaseState): PhaseState {
  if (state.phase === 'warp') {
    return { ...state, elapsed: state.elapsed + 1 };
  }

  if (state.phase === 'settle') {
    const settleT = Math.min(1, state.settleT + 1 / SETTLE_FRAMES);
    if (settleT >= 1) return { phase: 'orbit', elapsed: 0, settleT: 1 };
    return { phase: 'settle', elapsed: state.elapsed + 1, settleT };
  }

  return { ...state, elapsed: state.elapsed + 1, settleT: 1 };
}
