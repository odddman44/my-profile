export type ProjectStatus = 'live' | 'building';

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  status: ProjectStatus;
  tech: string[];
  /** 별의 발광색. 미지정 시 기본 강조색을 쓴다 */
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
  /** 소개 문단 */
  intro: string[];
};

/** 오프닝 시퀀스의 단계 */
export type Phase = 'warp' | 'settle' | 'orbit';
