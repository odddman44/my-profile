import { describe, expect, it } from 'vitest';
import { projects } from './projects';
import { channels } from './channels';
import { profile } from './profile';

describe('projects 데이터', () => {
  it('프로젝트가 하나 이상 있다', () => {
    expect(projects.length).toBeGreaterThan(0);
  });

  it('slug가 중복되지 않는다', () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('모든 url이 http로 시작한다', () => {
    for (const project of projects) {
      expect(project.url.startsWith('http')).toBe(true);
    }
  });

  it('빈 링크를 갖지 않는다', () => {
    for (const project of projects) {
      expect(project.url).not.toBe('#');
      expect(project.url.trim()).not.toBe('');
    }
  });
});

describe('channels 데이터', () => {
  it('빈 링크를 갖지 않는다', () => {
    for (const channel of channels) {
      expect(channel.href).not.toBe('#');
      expect(channel.href.trim()).not.toBe('');
    }
  });
});

describe('profile 데이터', () => {
  it('소개 문단이 비어 있지 않다', () => {
    expect(profile.intro.length).toBeGreaterThan(0);
  });
});
