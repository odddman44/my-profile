import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  // F-3: 스펙 §6은 "빈 곳 클릭 · 닫기 버튼 · Esc 키 셋 다" 지원을 요구하지만
  // 빈 곳 클릭은 어느 태스크에서도 구현되지 않았다. 모바일 하단 시트에서는
  // 시트 위쪽을 탭해 닫는 것이 자연스러운 제스처라 특히 영향이 크다.
  it('별을 열고 빈 곳을 클릭하면 패널이 닫힌다', () => {
    const { container } = render(<Stage />);
    fireEvent.click(screen.getAllByRole('link')[0]);
    expect(screen.getByRole('dialog')).toBeDefined();

    const main = container.querySelector('main')!;
    fireEvent.pointerDown(main, { clientX: 5, clientY: 5 });
    fireEvent.pointerUp(main, { clientX: 5, clientY: 5 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('빈 곳을 눌러 드래그하면(포인터가 움직이면) 패널이 닫히지 않는다', () => {
    // 빈 곳을 잡고 성좌를 돌리려는 사용자가 패널을 잃지 않아야 한다
    const { container } = render(<Stage />);
    fireEvent.click(screen.getAllByRole('link')[0]);
    expect(screen.getByRole('dialog')).toBeDefined();

    const main = container.querySelector('main')!;
    fireEvent.pointerDown(main, { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(main, { clientX: 80, clientY: 5 });
    fireEvent.pointerUp(main, { clientX: 80, clientY: 5 });
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});
