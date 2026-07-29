import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Hero } from './Hero';
import { Projects } from './Projects';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';

afterEach(cleanup);

describe('Hero', () => {
  it('히어로 카피를 모두 렌더링한다', () => {
    render(<Hero />);
    for (const line of profile.heroCopy) {
      expect(screen.getByText(line)).toBeDefined();
    }
  });

  it('h1을 정확히 하나 갖는다', () => {
    render(<Hero />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('Projects', () => {
  it('모든 프로젝트를 렌더링한다', () => {
    render(<Projects />);
    for (const project of projects) {
      expect(screen.getByText(project.name)).toBeDefined();
    }
  });

  it('외부 링크에 보안 속성을 붙인다', () => {
    render(<Projects />);
    for (const link of screen.getAllByRole('link')) {
      if (link.getAttribute('target') === '_blank') {
        expect(link.getAttribute('rel')).toContain('noopener');
      }
    }
  });

  it('개발 중인 프로젝트에 상태 배지를 표시한다', () => {
    render(<Projects />);
    const building = projects.filter((p) => p.status === 'building');
    if (building.length > 0) {
      expect(screen.getAllByText('개발 중').length).toBe(building.length);
    }
  });

  it('빈 링크를 렌더링하지 않는다', () => {
    render(<Projects />);
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).not.toBe('#');
    }
  });
});
