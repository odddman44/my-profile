import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './page';

beforeEach(() => {
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

describe('페이지 접근성', () => {
  it('h1이 정확히 하나다', () => {
    render(<Home />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('제목 레벨이 h1에서 h2로만 내려간다', () => {
    render(<Home />);
    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName[1]));
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it('모든 링크에 접근 가능한 이름이 있다', () => {
    render(<Home />);
    for (const link of screen.getAllByRole('link')) {
      expect(link.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it('빈 링크가 하나도 없다', () => {
    render(<Home />);
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toBe('#');
      expect(href.trim().length).toBeGreaterThan(0);
    }
  });
});
