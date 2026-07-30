import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CosmosBackground } from './CosmosBackground';

afterEach(cleanup);

describe('CosmosBackground', () => {
  it('캔버스를 스크린 리더에서 숨긴다', () => {
    const { container } = render(<CosmosBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
  });

  it('클릭을 가로채지 않는다', () => {
    const { container } = render(<CosmosBackground />);
    expect(container.querySelector('canvas')?.className).toContain('pointer-events-none');
  });

  it('언마운트되어도 예외가 발생하지 않는다', () => {
    const { unmount } = render(<CosmosBackground />);
    expect(() => unmount()).not.toThrow();
  });

  it('2D 컨텍스트를 얻지 못해도 렌더링이 깨지지 않는다', () => {
    // jsdom에는 캔버스 컨텍스트가 없다. 실제 브라우저에서도
    // 하드웨어 가속 비활성 등으로 null이 반환될 수 있다.
    // getContext는 오버로드가 많아 TS가 null 반환을 거부한다. 테스트 목적상 단언으로 통과시킨다.
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null as never);
    expect(() => render(<CosmosBackground />)).not.toThrow();
    spy.mockRestore();
  });
});
