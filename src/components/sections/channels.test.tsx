import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Channels } from './Channels';
import { channels } from '@/data/channels';

afterEach(cleanup);

describe('Channels', () => {
  it('등록된 채널을 모두 렌더링한다', () => {
    render(<Channels />);
    expect(screen.getAllByRole('link')).toHaveLength(channels.length);
  });

  it('메일 링크는 새 탭으로 열지 않는다', () => {
    render(<Channels />);
    for (const link of screen.getAllByRole('link')) {
      if (link.getAttribute('href')?.startsWith('mailto:')) {
        expect(link.getAttribute('target')).toBeNull();
      }
    }
  });
});
