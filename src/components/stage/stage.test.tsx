import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Stage } from './Stage';
import { projects } from '@/data/projects';
import { channels } from '@/data/channels';

afterEach(cleanup);

describe('Stage', () => {
  it('모든 프로젝트와 채널을 링크로 렌더링한다', () => {
    render(<Stage />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(projects.length + channels.length);
  });

  it('모든 링크가 유효한 주소를 가진다', () => {
    render(<Stage />);
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toBe('#');
      expect(href.trim().length).toBeGreaterThan(0);
    }
  });

  it('캔버스를 보조 기술에서 숨긴다', () => {
    const { container } = render(<Stage />);
    const canvas = container.querySelector('canvas');
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    expect(canvas?.className).toContain('pointer-events-none');
  });

  it('중심 항성이 키보드 순서에서 첫 번째다', () => {
    // 처음 Tab을 눌렀을 때 닿는 것이 "이 사람이 누구인가"여야 한다
    const { container } = render(<Stage />);
    const focusable = container.querySelectorAll('a[href], button');
    expect(focusable[0].textContent).toContain('오드');
  });

  it('언마운트되어도 예외가 없다', () => {
    const { unmount } = render(<Stage />);
    expect(() => unmount()).not.toThrow();
  });
});
