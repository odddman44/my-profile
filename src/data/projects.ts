import type { Project } from '@/types';

export const projects: Project[] = [
  {
    slug: 'todo',
    name: 'Todo',
    tagline: '할 일을 기록하고 관리하는 앱. 오늘의 한 문장과 함께하는 Todo',
    url: 'https://todo.cosmoslog.org',
    status: 'live',
    tech: ['Next.js', 'TypeScript'],
  },
  // TODO: 실제 Vercel 배포 URL로 교체 필요
  {
    slug: 'blog',
    name: 'Blog',
    tagline: 'Notion을 CMS로 쓰는 블로그',
    url: 'https://vercel.com',
    status: 'building',
    tech: ['Next.js', 'Notion API'],
  },
  {
    slug: 'Moija',
    name: '모이자',
    tagline: '모임을 주최하고 참가자를 모으는 앱',
    url: 'https://moija.cosmoslog.org',
    status: 'live',
    tech: ['Next.js', 'TypeScript'],
  },
  // TODO: 실제 Vercel 배포 URL로 교체 필요
  {
    slug: 'travel',
    name: 'Travel',
    tagline: '여행 일정을 계획하는 앱',
    url: 'https://vercel.com',
    status: 'building',
    tech: ['Next.js', 'TypeScript'],
  },
];
