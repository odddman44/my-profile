import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntroControls } from './IntroControls';

afterEach(cleanup);

describe('IntroControls', () => {
  it('워프 중에는 건너뛰기가 처음부터 있다', () => {
    // 강제 대기는 이탈로 이어진다. 버튼이 뜨기 전에도 빠져나갈 수 있어야 한다.
    render(<IntroControls phase="warp" enterVisible={false} onEnter={() => {}} />);
    expect(screen.getByRole('button', { name: '건너뛰기' })).toBeDefined();
  });

  it('2초 전에는 진입 버튼이 없다', () => {
    render(<IntroControls phase="warp" enterVisible={false} onEnter={() => {}} />);
    expect(screen.queryByRole('button', { name: '진입' })).toBeNull();
  });

  it('2초가 지나면 진입 버튼이 나온다', () => {
    render(<IntroControls phase="warp" enterVisible onEnter={() => {}} />);
    expect(screen.getByRole('button', { name: '진입' })).toBeDefined();
  });

  it('진입을 누르면 알린다', () => {
    const onEnter = vi.fn();
    render(<IntroControls phase="warp" enterVisible onEnter={onEnter} />);
    screen.getByRole('button', { name: '진입' }).click();
    expect(onEnter).toHaveBeenCalled();
  });

  it('건너뛰기도 같은 동작을 한다', () => {
    const onEnter = vi.fn();
    render(<IntroControls phase="warp" enterVisible={false} onEnter={onEnter} />);
    screen.getByRole('button', { name: '건너뛰기' }).click();
    expect(onEnter).toHaveBeenCalled();
  });

  it('성좌에 도착하면 아무 버튼도 남지 않는다', () => {
    render(<IntroControls phase="orbit" enterVisible={false} onEnter={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('감속 중에도 버튼이 사라진다', () => {
    render(<IntroControls phase="settle" enterVisible onEnter={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('도메인을 표시한다', () => {
    render(<IntroControls phase="warp" enterVisible={false} onEnter={() => {}} />);
    expect(screen.getByText('me.cosmoslog.org')).toBeDefined();
  });
});
