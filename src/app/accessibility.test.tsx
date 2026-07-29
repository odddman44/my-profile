import { readFileSync } from 'node:fs';
import path from 'node:path';
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

describe('JS 실패 시에도 콘텐츠가 읽힌다', () => {
  // 이 파일의 beforeEach는 observe()가 콜백을 절대 호출하지 않는 IntersectionObserver를 스텁한다.
  // 즉 Reveal의 visible 상태는 영원히 false로 남는다 — no-JS 정적 HTML과 구조적으로 동일한 상황이다.
  it('reveal 콜백이 트리거되지 않아도 About/Channels 텍스트는 DOM에서 조회된다', () => {
    render(<Home />);
    expect(screen.getByText('나')).toBeDefined();
    expect(screen.getByText('채널')).toBeDefined();
  });

  it('reveal 콜백이 트리거되지 않아도 모든 data-reveal 요소가 렌더링된다', () => {
    const { container } = render(<Home />);
    const revealed = container.querySelectorAll('[data-reveal]');
    expect(revealed.length).toBeGreaterThan(0);
  });

  it('레이아웃에 JS 비활성 시 data-reveal opacity를 강제하는 noscript 스타일이 포함된다', () => {
    // jsdom은 React가 만든 <noscript> 자식을 렌더링하지 않으므로(내용이 항상 비어버림)
    // 렌더링 대신 소스 텍스트로 noscript 오버라이드 존재를 검증한다
    const layoutSource = readFileSync(path.join(__dirname, 'layout.tsx'), 'utf-8');
    expect(layoutSource).toContain('<noscript>');
    expect(layoutSource).toContain(
      '[data-reveal]{opacity:1!important;transform:none!important}',
    );
  });
});
