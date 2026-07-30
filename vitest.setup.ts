import { vi } from 'vitest';

// jsdom에는 window.matchMedia가 구현되어 있지 않다.
// readEnvironment()가 이를 호출하므로 테스트 환경에서 최소한의 스텁을 제공한다.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
