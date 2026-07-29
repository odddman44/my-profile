import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GlassPanel } from './GlassPanel';

afterEach(cleanup);

describe('GlassPanel', () => {
  it('자식 요소를 그대로 렌더링한다', () => {
    render(<GlassPanel><p>본문</p></GlassPanel>);
    expect(screen.getByText('본문')).toBeDefined();
  });

  it('추가 className을 합쳐준다', () => {
    const { container } = render(<GlassPanel className="mt-10">x</GlassPanel>);
    expect(container.firstElementChild?.className).toContain('mt-10');
  });

  it('배경 블러 클래스를 갖는다', () => {
    const { container } = render(<GlassPanel>x</GlassPanel>);
    expect(container.firstElementChild?.className).toContain('backdrop-blur');
  });
});
