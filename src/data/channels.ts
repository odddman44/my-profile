import type { Channel } from '@/types';

// TODO: 인스타그램·블로그 주소 확정 후 추가.
// 주소가 정해지지 않은 채널은 배열에 넣지 않는다 — 빈 링크를 만들지 않기 위함이다.
export const channels: Channel[] = [
  { kind: 'github', label: 'GitHub', href: 'https://github.com/odddman44' },
  { kind: 'email', label: 'okw9344@gmail.com', href: 'mailto:okw9344@gmail.com' },
];
