import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Home from './page';
import { channels } from '@/data/channels';
import { projects } from '@/data/projects';

afterEach(cleanup);

describe('페이지 접근성', () => {
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

  it('모든 외부 링크가 보안 속성을 함께 갖는다', () => {
    render(<Home />);
    for (const link of screen.getAllByRole('link')) {
      if (link.getAttribute('target') !== '_blank') continue;
      const rel = link.getAttribute('rel') ?? '';
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });

  it('JS가 실행되기 전에도 모든 목적지가 HTML에 존재한다', () => {
    // 캔버스에 그린 그림이었다면 이 테스트는 통과할 수 없다
    render(<Home />);
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    for (const project of projects) expect(hrefs).toContain(project.url);
    for (const channel of channels) expect(hrefs).toContain(channel.href);
  });

  it('키보드로 도달 가능한 요소가 링크 수보다 많다', () => {
    // 중심 항성 버튼과 건너뛰기 버튼이 더 있어야 한다
    const { container } = render(<Home />);
    const focusable = container.querySelectorAll('a[href], button');
    expect(focusable.length).toBeGreaterThan(projects.length + channels.length);
  });
});
