import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Home from './page';
import { channels } from '@/data/channels';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';

const TOTAL_LINKS = projects.length + channels.length;

afterEach(cleanup);

describe('페이지 접근성', () => {
  it('모든 링크에 접근 가능한 이름이 있다', () => {
    render(<Home />);
    const links = screen.getAllByRole('link');
    // 링크 컬렉션이 비어 있으면 아래 for문이 0번 돌아 통과해버린다.
    // 실제 데이터 개수에 고정해 전면 캔버스 회귀도 잡아낸다.
    expect(links.length).toBe(TOTAL_LINKS);
    for (const link of links) {
      expect(link.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it('빈 링크가 하나도 없다', () => {
    render(<Home />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(TOTAL_LINKS);
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toBe('#');
      expect(href.trim().length).toBeGreaterThan(0);
    }
  });

  it('모든 외부 링크가 보안 속성을 함께 갖는다', () => {
    render(<Home />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(TOTAL_LINKS);
    for (const link of links) {
      if (link.getAttribute('target') !== '_blank') continue;
      const rel = link.getAttribute('rel') ?? '';
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });

  it('JS가 실행되기 전에도 모든 목적지가 HTML에 존재한다', () => {
    // 캔버스에 그린 그림이었다면 이 테스트는 통과할 수 없다.
    // href 값이 아니라 접근 가능한 이름(별 이름)으로 각 링크를 찾는다 —
    // projects.ts의 자리표시자 URL은 서로 중복되어 있어 href만으로는
    // 별 하나가 통째로 사라져도 다른 별의 href가 대신 걸려 통과해버릴 수 있다.
    render(<Home />);
    for (const project of projects) {
      const link = screen.getByRole('link', { name: project.name });
      expect(link.getAttribute('href')).toBe(project.url);
    }
    for (const channel of channels) {
      const link = screen.getByRole('link', { name: channel.label });
      expect(link.getAttribute('href')).toBe(channel.href);
    }
  });

  it('중심 항성 버튼과 건너뛰기 버튼이 링크와 별개로 키보드로 도달 가능하다', () => {
    // 개수 비교(focusable > links)만으로는 두 버튼 중 하나만 사라져도
    // 여전히 통과한다 — 이름으로 각각 확인해야 어떤 컨트롤이 없어졌는지 드러난다.
    render(<Home />);
    // getByRole은 매칭되는 요소가 없으면 그 자체로 던진다 — 존재 확인에 별도 매처가 필요 없다.
    screen.getByRole('button', { name: new RegExp(profile.displayName) });
    screen.getByRole('button', { name: '건너뛰기' });
  });
});
