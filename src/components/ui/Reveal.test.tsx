import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from './Reveal';

beforeEach(() => {
  // jsdom에는 IntersectionObserver가 없다
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Reveal', () => {
  it('자식을 렌더링한다', () => {
    render(<Reveal><p>내용</p></Reveal>);
    expect(screen.getByText('내용')).toBeDefined();
  });

  it('IntersectionObserver가 없는 환경에서도 내용이 보인다', () => {
    // 애니메이션은 장식이므로 실패해도 콘텐츠는 읽혀야 한다
    vi.unstubAllGlobals();
    const { container } = render(<Reveal><p>내용</p></Reveal>);
    expect(container.textContent).toContain('내용');
  });
});
