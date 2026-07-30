export type ProjectStatus = 'live' | 'building';

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  status: ProjectStatus;
  tech: string[];
  /** 카드 호버 시 발광색. 미지정 시 기본 강조색을 쓴다 */
  accent?: string;
};

export type ChannelKind = 'instagram' | 'github' | 'email' | 'blog';

export type Channel = {
  kind: ChannelKind;
  label: string;
  href: string;
};

export type Profile = {
  displayName: string;
  role: string;
  /** 히어로 대형 카피. 배열 요소마다 줄바꿈된다 */
  heroCopy: string[];
  /** 소개 문단 */
  intro: string[];
};
