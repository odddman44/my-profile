import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StarPanel } from './StarPanel';

afterEach(cleanup);

const project = {
  title: 'todo',
  body: ['할 일을 기록하고 관리하는 앱'],
  tech: ['Next.js', 'TypeScript'],
  status: 'building' as const,
  href: 'https://todo.cosmoslog.org',
  hrefLabel: '사이트 열기',
};

describe('StarPanel', () => {
  it('내용이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<StarPanel content={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('제목과 본문을 보여준다', () => {
    render(<StarPanel content={project} onClose={() => {}} />);
    expect(screen.getByText('todo')).toBeDefined();
    expect(screen.getByText('할 일을 기록하고 관리하는 앱')).toBeDefined();
  });

  it('개발 중인 항목에 배지를 보여준다', () => {
    render(<StarPanel content={project} onClose={() => {}} />);
    expect(screen.getByText('개발 중')).toBeDefined();
  });

  it('운영 중인 항목에는 배지가 없다', () => {
    render(<StarPanel content={{ ...project, status: 'live' }} onClose={() => {}} />);
    expect(screen.queryByText('개발 중')).toBeNull();
  });

  it('바로가기 링크에 보안 속성을 붙인다', () => {
    render(<StarPanel content={project} onClose={() => {}} />);
    const link = screen.getByRole('link', { name: /사이트 열기/ });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('링크가 없는 내용은 링크를 그리지 않는다', () => {
    render(<StarPanel content={{ title: '나', body: ['소개'] }} onClose={() => {}} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('닫기 버튼이 있다', () => {
    const onClose = vi.fn();
    render(<StarPanel content={project} onClose={onClose} />);
    screen.getByRole('button', { name: '닫기' }).click();
    expect(onClose).toHaveBeenCalled();
  });

  it('Esc 키로 닫힌다', () => {
    const onClose = vi.fn();
    render(<StarPanel content={project} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('대화상자로 알린다', () => {
    render(<StarPanel content={project} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('열리면 패널로 포커스를 옮긴다', () => {
    // 포커스가 별에 남아 있으면 키보드 사용자는 나머지 별을 전부 지나야 패널에 닿는다
    render(<StarPanel content={project} onClose={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('닫히면 원래 있던 요소로 포커스를 되돌린다', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<StarPanel content={project} onClose={() => {}} />);
    expect(document.activeElement).not.toBe(trigger);

    rerender(<StarPanel content={null} onClose={() => {}} />);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
