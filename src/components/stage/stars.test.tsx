import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoreStar } from './CoreStar';
import { StarLink } from './StarLink';
import { profile } from '@/data/profile';

afterEach(cleanup);

describe('CoreStar', () => {
  it('이름과 역할을 항상 보여준다', () => {
    render(<CoreStar profile={profile} onOpen={() => {}} />);
    expect(screen.getByText(profile.displayName)).toBeDefined();
    expect(screen.getByText(profile.role)).toBeDefined();
  });

  it('링크가 아니라 버튼이다 — 외부로 나가지 않는다', () => {
    render(<CoreStar profile={profile} onOpen={() => {}} />);
    expect(screen.getByRole('button')).toBeDefined();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('누르면 소개를 연다', () => {
    const onOpen = vi.fn();
    render(<CoreStar profile={profile} onOpen={onOpen} />);
    screen.getByRole('button').click();
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('StarLink', () => {
  const base = {
    id: 'todo',
    href: 'https://todo.cosmoslog.org',
    label: 'todo',
    accent: '129,140,248',
    isProject: true,
    onOpen: () => {},
  };

  it('진짜 링크로 렌더링된다', () => {
    render(<StarLink {...base} isFront={false} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(base.href);
  });

  it('외부 링크에 보안 속성을 함께 붙인다', () => {
    render(<StarLink {...base} isFront={false} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('빈 링크를 만들지 않는다', () => {
    render(<StarLink {...base} isFront={false} />);
    const href = screen.getByRole('link').getAttribute('href') ?? '';
    expect(href).not.toBe('#');
    expect(href.trim().length).toBeGreaterThan(0);
  });

  it('터치 타깃을 44px 이상 확보한다', () => {
    render(<StarLink {...base} isFront={false} />);
    // 시각적 점은 작아도 실제로 누를 수 있는 영역은 넓어야 한다
    expect(screen.getByRole('link').className).toContain('min-h-[44px]');
    expect(screen.getByRole('link').className).toContain('min-w-[44px]');
  });

  it('정면에 오면 이름이 보인다', () => {
    render(<StarLink {...base} isFront />);
    expect(screen.getByText('todo')).toBeDefined();
  });

  it('정면이 아니어도 이름은 DOM에 남는다', () => {
    // 스크린 리더와 검색엔진이 읽어야 하므로 지우지 않고 시각적으로만 숨긴다
    render(<StarLink {...base} isFront={false} />);
    expect(screen.getByText('todo')).toBeDefined();
  });

  it('평범한 클릭은 패널을 연다', () => {
    const onOpen = vi.fn();
    render(<StarLink {...base} isFront={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('link'));
    expect(onOpen).toHaveBeenCalledWith('todo');
  });

  it('새 탭으로 여는 클릭은 브라우저에 맡긴다', () => {
    // 링크처럼 생긴 것이 ⌘+클릭에 반응하지 않으면 고장으로 받아들여진다
    const onOpen = vi.fn();
    render(<StarLink {...base} isFront={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('link'), { metaKey: true });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
