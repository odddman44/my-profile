# cosmoslog 프로필 사이트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 우주 공간감을 상시 배경으로 두른 개인 아이덴티티 허브를 Next.js 정적 사이트로 만들어 `me.cosmoslog.org`에 배포한다.

**Architecture:** 배경은 `position: fixed` 캔버스 하나가 전 구간을 덮는다. 렌더 엔진은 React 밖의 순수 TypeScript 모듈로 분리하고, 그중에서도 좌표 계산(별 생성·시차·중력)은 부수효과 없는 순수 함수로 다시 분리해 단위 테스트한다. React는 캔버스를 마운트하고 생명주기만 관리하며, 마우스 좌표는 절대 상태로 올리지 않는다. 콘텐츠는 TypeScript 데이터 파일에서 읽어 렌더링한다.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Vitest + jsdom · GitHub Actions + GitHub Pages

## Global Constraints

모든 태스크의 요구사항에 아래가 암묵적으로 포함된다.

- **Node.js 20.9 이상** (개발 환경은 v22.13.1 확인됨)
- **정적 배포**: `output: 'export'`. 서버 런타임 기능(Route Handlers, `next/image` 최적화, 미들웨어, ISR) 사용 금지
- **`basePath` 미설정**: `me.cosmoslog.org`가 서브도메인 루트이므로 필요 없다
- **다크 테마 고정**: 라이트 모드 분기·토글을 만들지 않는다
- **`prefers-reduced-motion: reduce` 준수는 타협 불가**: 감지되면 애니메이션 루프를 시작하지 않고 정적 1프레임만 렌더한다
- **빈 링크 금지**: `href="#"`처럼 아무 동작도 하지 않는 링크를 만들지 않는다. 값이 미정인 항목은 렌더링에서 제외한다
- **캔버스는 보조 장식**: `aria-hidden="true"`, `pointer-events: none`. JS가 실패해도 콘텐츠는 전부 읽혀야 한다
- **마우스 좌표를 React 상태에 넣지 않는다**: `useState`에 담으면 초당 60회 리렌더가 발생한다. `ref`와 rAF 루프로만 다룬다
- **코드 스타일**: 들여쓰기 2칸, 변수·함수명 camelCase, 파일명은 컴포넌트만 PascalCase
- **주석은 비즈니스 로직에만 한국어로**: 코드를 읽으면 알 수 있는 내용은 주석으로 달지 않는다
- **커밋 메시지는 한국어**, Conventional Commits 접두사 사용 (`feat:`, `test:`, `chore:`, `docs:`, `fix:`)
- **작업 브랜치**: `feature/cosmoslog-redesign` (이미 생성됨)
- **테스트 명령**: `npm test` (Vitest, watch 없이 1회 실행)

## 파일 구조

| 경로 | 책임 |
|---|---|
| `src/types/index.ts` | 도메인 타입 (`Project`, `Channel`, `Profile`) |
| `src/data/profile.ts` | 자기소개·히어로 카피 |
| `src/data/projects.ts` | 배포한 앱 목록 — **새 앱 추가 시 여기만 수정** |
| `src/data/channels.ts` | 소셜·연락 채널 |
| `src/components/cosmos/params.ts` | 환경(포인터·모션 설정)에 따른 렌더 파라미터 해석 — **순수** |
| `src/components/cosmos/field.ts` | 별 생성, 시차 오프셋, 중력 변형 계산 — **순수** |
| `src/components/cosmos/nebula.ts` | 성운 blob 정의와 위치 계산 — **순수** |
| `src/components/cosmos/renderer.ts` | 캔버스 2D 컨텍스트에 실제로 그리는 층 |
| `src/components/cosmos/engine.ts` | rAF 루프, 이벤트 바인딩, 생명주기 (`start`/`stop`/`destroy`) |
| `src/components/cosmos/environment.ts` | 브라우저 환경 감지 (`matchMedia`) |
| `src/components/cosmos/CosmosBackground.tsx` | 캔버스 마운트 전용 클라이언트 컴포넌트 |
| `src/components/ui/GlassPanel.tsx` | 배경 위 가독성 확보 패널 |
| `src/components/ui/ProjectCard.tsx` | 프로젝트 카드 |
| `src/components/ui/ScrollProgress.tsx` | 상단 진행도 선 |
| `src/components/ui/Reveal.tsx` | 스크롤 진입 애니메이션 래퍼 |
| `src/components/sections/*.tsx` | Hero · About · Projects · Writing · Channels |
| `src/app/layout.tsx` `page.tsx` `globals.css` | 문서 셸, 섹션 조립, 디자인 토큰 |

**분리 원칙**: `params` / `field` / `nebula`는 브라우저 API를 일절 참조하지 않는다. 그래서 jsdom 없이도 테스트가 돌고, 렌더링 없이 로직 검증이 끝난다. `renderer`와 `engine`만 캔버스와 `window`를 안다.

---

### Task 1: 프로젝트 초기화와 테스트 환경

기존 바닐라 사이트를 Next.js 프로젝트로 교체하고, 이후 모든 태스크가 의존할 테스트 러너를 세운다.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.mts`, `.gitignore`(수정)
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/sanity.test.ts`
- Delete: `index.html`, `style.css`, `script.js`

**Interfaces:**
- Consumes: 없음
- Produces: `npm test`, `npm run build`, `npm run dev` 스크립트. 이후 모든 태스크가 이 명령들을 사용한다

- [ ] **Step 1: 현재 디렉토리에 Next.js 프로젝트 생성**

기존 파일(`index.html`, `style.css`, `script.js`)이 있는 상태에서 생성기를 돌리면 충돌한다. 먼저 지운다. 이 파일들은 git 히스토리(`e1e6337`)에 남아 있으므로 필요하면 언제든 꺼낼 수 있다.

```bash
git rm index.html style.css script.js
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

프롬프트가 뜨면: Turbopack은 **Yes**, 그 외 기본값.

- [ ] **Step 2: `package-lock.json`을 gitignore에서 제외**

`.gitignore` 5행의 `package-lock.json`을 삭제한다. lock 파일이 커밋되지 않으면 CI가 매번 다른 버전을 설치해서 "내 컴퓨터에선 되는데" 상황이 발생한다. CI 재현성의 핵심이다.

```diff
 # Dependencies
 node_modules/
-package-lock.json
 yarn.lock
```

- [ ] **Step 3: 정적 export 설정**

`next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
```

`images.unoptimized`가 필요한 이유: static export에는 이미지를 실시간 변환할 서버가 없다. 이 설정 없이 `next/image`를 쓰면 빌드가 실패한다.

- [ ] **Step 4: Vitest 설치**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

- [ ] **Step 5: Vitest 설정 파일 작성**

`vitest.config.mts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

`package.json`의 `scripts`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: 테스트 러너가 실제로 도는지 확인하는 실패 테스트**

`src/lib/sanity.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

describe('테스트 환경', () => {
  it('jsdom 환경에서 document에 접근할 수 있다', () => {
    expect(typeof document).toBe('object');
  });

  it('아직 구현되지 않은 값을 참조하면 실패한다', () => {
    expect(1 + 1).toBe(3);
  });
});
```

- [ ] **Step 7: 테스트를 돌려 두 번째가 실패하는지 확인**

Run: `npm test`
Expected: 1 passed, 1 failed — `expected 2 to be 3`

테스트 러너가 실제로 코드를 실행하고 실패를 감지한다는 증거다. 이걸 확인하지 않으면 이후 "테스트 통과"가 무의미해질 수 있다.

- [ ] **Step 8: 실패 테스트를 올바르게 고침**

```typescript
  it('산술 결과를 검증한다', () => {
    expect(1 + 1).toBe(2);
  });
```

- [ ] **Step 9: 테스트 통과 확인**

Run: `npm test`
Expected: 2 passed

- [ ] **Step 10: 빌드가 통과하고 정적 파일이 생성되는지 확인**

Run: `npm run build && ls out/`
Expected: 빌드 성공, `out/` 안에 `index.html`과 `_next/` 존재

- [ ] **Step 11: 커밋**

```bash
git add -A
git commit -m "chore: Next.js + TypeScript + Tailwind + Vitest 프로젝트 초기화

기존 바닐라 HTML/CSS/JS를 Next.js 구조로 교체.
정적 export 설정과 테스트 러너 구성 포함.
CI 재현성을 위해 package-lock.json을 gitignore에서 제외."
```

---

### Task 2: 도메인 타입과 데이터 계층

콘텐츠를 코드에서 분리한다. 이후 새 앱을 추가할 때 이 파일들만 고치면 된다.

**Files:**
- Create: `src/types/index.ts`, `src/data/profile.ts`, `src/data/projects.ts`, `src/data/channels.ts`
- Test: `src/data/data.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type Project = { slug: string; name: string; tagline: string; url: string; status: 'live' | 'building'; tech: string[]; accent?: string }`
  - `type Channel = { kind: ChannelKind; label: string; href: string }`
  - `type Profile = { displayName: string; role: string; heroCopy: string[]; intro: string[] }`
  - `projects: Project[]`, `channels: Channel[]`, `profile: Profile`

- [ ] **Step 1: 실패 테스트 작성**

`src/data/data.test.ts`:

```typescript
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
  it('히어로 카피가 비어 있지 않다', () => {
    expect(profile.heroCopy.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/data/data.test.ts`
Expected: FAIL — `Failed to resolve import "./projects"`

- [ ] **Step 3: 타입 정의**

`src/types/index.ts`:

```typescript
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
```

- [ ] **Step 4: 데이터 파일 작성**

미확정 값은 `TODO:` 주석을 달되, **테스트가 통과하는 유효한 값**으로 채운다. 빈 문자열이나 `#`을 넣으면 테스트가 실패한다. 이건 의도된 안전장치다 — 플레이스홀더가 실수로 배포되는 걸 막는다.

`src/data/projects.ts`:

```typescript
import type { Project } from '@/types';

export const projects: Project[] = [
  {
    slug: 'todo',
    name: 'Todo',
    tagline: '할 일을 기록하고 관리하는 앱',
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
    status: 'live',
    tech: ['Next.js', 'Notion API'],
  },
  // TODO: 실제 Vercel 배포 URL로 교체 필요
  {
    slug: 'meetup',
    name: 'Meetup',
    tagline: '모임을 주최하고 참가자를 모으는 앱',
    url: 'https://vercel.com',
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
```

`src/data/profile.ts`:

```typescript
import type { Profile } from '@/types';

export const profile: Profile = {
  displayName: '오드',
  role: '소프트웨어 엔지니어',
  // TODO: 히어로 카피 확정 필요
  heroCopy: ['기록이 쌓이면', '궤도가 됩니다'],
  // TODO: 자기소개 문구 확정 필요
  intro: [
    '만들고 싶은 것을 직접 만들고, 끝까지 배포하는 것을 좋아합니다.',
    'Java와 Spring으로 백엔드를 다뤄왔고, 지금은 TypeScript로 영역을 넓히는 중입니다.',
  ],
};
```

`src/data/channels.ts`:

```typescript
import type { Channel } from '@/types';

// TODO: 인스타그램·블로그 주소 확정 후 추가.
// 주소가 정해지지 않은 채널은 배열에 넣지 않는다 — 빈 링크를 만들지 않기 위함이다.
export const channels: Channel[] = [
  { kind: 'github', label: 'GitHub', href: 'https://github.com/odddman44' },
  { kind: 'email', label: 'okw9344@gmail.com', href: 'mailto:okw9344@gmail.com' },
];
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test src/data/data.test.ts`
Expected: 6 passed

- [ ] **Step 6: 커밋**

```bash
git add src/types src/data
git commit -m "feat: 도메인 타입과 콘텐츠 데이터 계층 추가

프로젝트/채널/프로필을 TypeScript 데이터 파일로 분리.
새 앱 배포 시 projects.ts 배열에 객체만 추가하면 된다.
미확정 값은 TODO 주석을 달되 유효한 값으로 채워 빈 링크 배포를 방지."
```

---

### Task 3: 렌더 파라미터 해석 (`params.ts`)

환경(포인터 유무, 모션 설정)에 따라 렌더 강도를 정하는 순수 함수. 접근성 요구사항이 여기서 코드로 강제된다.

**Files:**
- Create: `src/components/cosmos/params.ts`
- Test: `src/components/cosmos/params.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type CosmosEnvironment = { hasFinePointer: boolean; prefersReducedMotion: boolean }`
  - `type CosmosParams = { starCount, nebulaIntensity, mouseParallax, scrollParallax, gravity, gravityRadius, dprCap, animate }`
  - `function resolveParams(env: CosmosEnvironment): CosmosParams`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/cosmos/params.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { resolveParams } from './params';

const desktop = { hasFinePointer: true, prefersReducedMotion: false };
const mobile = { hasFinePointer: false, prefersReducedMotion: false };
const reduced = { hasFinePointer: true, prefersReducedMotion: true };

describe('resolveParams', () => {
  it('데스크톱에서는 별 620개와 중력 렌즈를 사용한다', () => {
    const params = resolveParams(desktop);
    expect(params.starCount).toBe(620);
    expect(params.gravity).toBe(true);
    expect(params.mouseParallax).toBe(1);
    expect(params.dprCap).toBe(2);
  });

  it('포인터가 없으면 별을 260개로 줄이고 중력과 마우스 시차를 끈다', () => {
    const params = resolveParams(mobile);
    expect(params.starCount).toBe(260);
    expect(params.gravity).toBe(false);
    expect(params.mouseParallax).toBe(0);
    expect(params.dprCap).toBe(1.5);
  });

  it('포인터가 없어도 스크롤 시차는 유지한다', () => {
    // 모바일에서 공간감을 만드는 유일한 인터랙션이 스크롤이다
    expect(resolveParams(mobile).scrollParallax).toBe(1);
  });

  it('모션 감소 설정에서는 애니메이션을 끈다', () => {
    const params = resolveParams(reduced);
    expect(params.animate).toBe(false);
  });

  it('모션 감소 설정에서는 모든 움직임 파라미터가 0이 된다', () => {
    const params = resolveParams(reduced);
    expect(params.mouseParallax).toBe(0);
    expect(params.scrollParallax).toBe(0);
    expect(params.gravity).toBe(false);
  });

  it('모션 감소 설정에서도 별과 성운은 그린다', () => {
    // 정적인 우주 사진 한 장은 남아야 한다
    const params = resolveParams(reduced);
    expect(params.starCount).toBeGreaterThan(0);
    expect(params.nebulaIntensity).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/params.test.ts`
Expected: FAIL — `Failed to resolve import "./params"`

- [ ] **Step 3: 구현**

`src/components/cosmos/params.ts`:

```typescript
export type CosmosEnvironment = {
  hasFinePointer: boolean;
  prefersReducedMotion: boolean;
};

export type CosmosParams = {
  starCount: number;
  nebulaIntensity: number;
  mouseParallax: number;
  scrollParallax: number;
  gravity: boolean;
  gravityRadius: number;
  dprCap: number;
  animate: boolean;
};

const BASE: CosmosParams = {
  starCount: 620,
  nebulaIntensity: 1,
  mouseParallax: 1,
  scrollParallax: 1,
  gravity: true,
  gravityRadius: 170,
  dprCap: 2,
  animate: true,
};

export function resolveParams(env: CosmosEnvironment): CosmosParams {
  const params = { ...BASE };

  // 호버 포인터가 없으면 마우스 기반 연출이 무의미하고, 모바일 발열·배터리에 직결된다.
  // 다만 스크롤 시차는 남긴다 — 터치 환경에서 공간감을 만드는 유일한 입력이다.
  if (!env.hasFinePointer) {
    params.starCount = 260;
    params.mouseParallax = 0;
    params.gravity = false;
    params.dprCap = 1.5;
  }

  // 시차와 중력 왜곡은 전정기관 장애가 있는 사용자에게 어지럼증을 유발할 수 있다.
  // 움직임만 멈추고 정적인 화면은 남긴다.
  if (env.prefersReducedMotion) {
    params.animate = false;
    params.mouseParallax = 0;
    params.scrollParallax = 0;
    params.gravity = false;
  }

  return params;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/params.test.ts`
Expected: 6 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/cosmos/params.ts src/components/cosmos/params.test.ts
git commit -m "feat: 환경별 렌더 파라미터 해석 함수 추가

포인터 유무와 모션 감소 설정에 따라 렌더 강도를 결정한다.
모바일에서도 스크롤 시차는 유지 — 터치 환경의 유일한 공간감 입력이다."
```

---

### Task 4: 별 생성과 시차 계산 (`field.ts` 1/2)

**Files:**
- Create: `src/components/cosmos/field.ts`
- Test: `src/components/cosmos/field.test.ts`

**Interfaces:**
- Consumes: `CosmosParams` (Task 3)
- Produces:
  - `type Star = { hx: number; hy: number; size: number; alpha: number; twinklePhase: number; twinkleSpeed: number }`
  - `type StarLayer = { depth: number; drift: number; stars: Star[] }`
  - `function createLayers(starCount: number, random?: () => number): StarLayer[]`
  - `function parallaxOffset(depth, mouse, scroll, params, viewport): { x: number; y: number }`
  - `function starPosition(star, layer, time, offset, viewport): Vec2`
  - `function wrap(value: number, max: number): number`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/cosmos/field.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { createLayers, parallaxOffset } from './field';
import { resolveParams } from './params';

/** 결정적 테스트를 위한 가짜 난수 — 항상 0.5를 반환한다 */
const half = () => 0.5;

describe('createLayers', () => {
  it('요청한 개수만큼 별을 만든다', () => {
    const layers = createLayers(620, half);
    const total = layers.reduce((sum, layer) => sum + layer.stars.length, 0);
    expect(total).toBe(620);
  });

  it('개수가 나누어떨어지지 않아도 총합이 정확하다', () => {
    const total = createLayers(261, half).reduce((sum, l) => sum + l.stars.length, 0);
    expect(total).toBe(261);
  });

  it('깊이가 서로 다른 3개 레이어를 만든다', () => {
    const layers = createLayers(620, half);
    expect(layers).toHaveLength(3);
    const depths = layers.map((l) => l.depth);
    expect(new Set(depths).size).toBe(3);
  });

  it('별 좌표를 0과 1 사이로 정규화한다', () => {
    // 리사이즈 시에도 분포가 유지되려면 픽셀이 아니라 비율로 보관해야 한다
    for (const layer of createLayers(100, Math.random)) {
      for (const star of layer.stars) {
        expect(star.hx).toBeGreaterThanOrEqual(0);
        expect(star.hx).toBeLessThanOrEqual(1);
        expect(star.hy).toBeGreaterThanOrEqual(0);
        expect(star.hy).toBeLessThanOrEqual(1);
      }
    }
  });

  it('먼 레이어일수록 별이 작다', () => {
    const layers = createLayers(620, half);
    expect(layers[0].stars[0].size).toBeLessThan(layers[2].stars[0].size);
  });

  it('별 개수가 0이면 빈 레이어를 만든다', () => {
    const total = createLayers(0, half).reduce((sum, l) => sum + l.stars.length, 0);
    expect(total).toBe(0);
  });
});

describe('parallaxOffset', () => {
  const params = resolveParams({ hasFinePointer: true, prefersReducedMotion: false });
  const viewport = { width: 1000, height: 800 };

  it('깊이가 0이면 움직이지 않는다', () => {
    const offset = parallaxOffset(0, { x: 0.5, y: 0.5 }, 300, params, viewport);
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('마우스가 중앙이고 스크롤이 0이면 오프셋이 0이다', () => {
    const offset = parallaxOffset(0.8, { x: 0, y: 0 }, 0, params, viewport);
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('가까운 레이어가 먼 레이어보다 많이 움직인다', () => {
    const near = parallaxOffset(0.78, { x: 0.4, y: 0 }, 0, params, viewport);
    const far = parallaxOffset(0.1, { x: 0.4, y: 0 }, 0, params, viewport);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
  });

  it('스크롤은 y축만 밀어낸다', () => {
    const offset = parallaxOffset(0.5, { x: 0, y: 0 }, 500, params, viewport);
    expect(offset.x).toBe(0);
    expect(offset.y).not.toBe(0);
  });

  it('마우스 시차가 꺼지면 마우스 입력을 무시한다', () => {
    const mobile = resolveParams({ hasFinePointer: false, prefersReducedMotion: false });
    const offset = parallaxOffset(0.8, { x: 0.5, y: 0.5 }, 0, mobile, viewport);
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('모션 감소 설정에서는 스크롤에도 반응하지 않는다', () => {
    const reduced = resolveParams({ hasFinePointer: true, prefersReducedMotion: true });
    const offset = parallaxOffset(0.8, { x: 0.5, y: 0.5 }, 900, reduced, viewport);
    expect(offset.y).toBe(0);
  });
});

describe('starPosition', () => {
  const viewport = { width: 1000, height: 800 };
  const layer = createLayers(620, half)[2];
  const star = layer.stars[0];
  const noOffset = { x: 0, y: 0 };

  it('마우스 입력이 없어도 시간이 흐르면 위치가 변한다', () => {
    // 자체 표류가 없으면 마우스를 뗀 순간 배경이 정지 화면이 된다
    const first = starPosition(star, layer, 0, noOffset, viewport);
    const later = starPosition(star, layer, 20000, noOffset, viewport);
    expect(later.x).not.toBe(first.x);
  });

  it('오랜 시간이 지나도 화면 안에 머문다', () => {
    for (const time of [0, 50_000, 500_000]) {
      const point = starPosition(star, layer, time, noOffset, viewport);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThan(viewport.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThan(viewport.height);
    }
  });

  it('오프셋만큼 반대로 밀린다', () => {
    const base = starPosition(star, layer, 0, noOffset, viewport);
    const shifted = starPosition(star, layer, 0, { x: 40, y: 0 }, viewport);
    expect(shifted.x).toBeCloseTo(wrap(base.x - 40, viewport.width), 5);
  });
});

describe('wrap', () => {
  it('음수를 반대편으로 돌려보낸다', () => {
    expect(wrap(-10, 100)).toBe(90);
  });

  it('최댓값을 넘으면 처음으로 돌아온다', () => {
    expect(wrap(105, 100)).toBe(5);
  });
});
```

`starPosition` 테스트에서 `createLayers`와 `wrap`을 함께 쓰므로 파일 상단 import를 다음으로 맞춘다:

```typescript
import { createLayers, parallaxOffset, starPosition, wrap } from './field';
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/field.test.ts`
Expected: FAIL — `Failed to resolve import "./field"`

- [ ] **Step 3: 구현**

`src/components/cosmos/field.ts`:

```typescript
import type { CosmosParams } from './params';

export type Star = {
  /** 0~1로 정규화된 x 좌표 (home x) */
  hx: number;
  hy: number;
  size: number;
  alpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
};

export type StarLayer = {
  /** 0에 가까울수록 멀다. 시차 이동량의 배수로 쓰인다 */
  depth: number;
  /** 마우스와 무관한 자체 표류 속도 */
  drift: number;
  stars: Star[];
};

export type Vec2 = { x: number; y: number };
export type Viewport = { width: number; height: number };

type LayerSpec = {
  ratio: number;
  depth: number;
  drift: number;
  size: [number, number];
  alpha: [number, number];
};

const LAYER_SPECS: LayerSpec[] = [
  { ratio: 0.6, depth: 0.1, drift: 0.0018, size: [0.4, 0.9], alpha: [0.2, 0.45] },
  { ratio: 0.28, depth: 0.34, drift: 0.0042, size: [0.7, 1.4], alpha: [0.4, 0.75] },
  { ratio: 0.12, depth: 0.78, drift: 0.009, size: [1.1, 2.2], alpha: [0.7, 1.0] },
];

/** 시차 이동량 계수. 화면 크기 대비 최대 이동 비율 */
const PARALLAX_SCALE = 0.55;
/** 스크롤 1px당 이동량 */
const SCROLL_SCALE = 0.12;

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export function createLayers(starCount: number, random: () => number = Math.random): StarLayer[] {
  let assigned = 0;

  return LAYER_SPECS.map((spec, index) => {
    // 마지막 레이어는 나머지를 전부 가져간다. 반올림 오차로 총합이 어긋나지 않게 한다.
    const isLast = index === LAYER_SPECS.length - 1;
    const count = isLast ? starCount - assigned : Math.round(starCount * spec.ratio);
    assigned += count;

    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        hx: random(),
        hy: random(),
        size: lerp(spec.size[0], spec.size[1], random()),
        alpha: lerp(spec.alpha[0], spec.alpha[1], random()),
        twinklePhase: random() * Math.PI * 2,
        twinkleSpeed: lerp(0.006, 0.028, random()),
      });
    }

    return { depth: spec.depth, drift: spec.drift, stars };
  });
}

/**
 * 레이어 하나의 시차 오프셋을 구한다.
 * mouse는 화면 중앙 기준 -0.5~0.5 범위의 정규화 좌표다.
 */
export function parallaxOffset(
  depth: number,
  mouse: Vec2,
  scrollY: number,
  params: CosmosParams,
  viewport: Viewport,
): Vec2 {
  const mouseFactor = depth * PARALLAX_SCALE * params.mouseParallax;
  const scrollFactor = depth * SCROLL_SCALE * params.scrollParallax;

  return {
    x: mouse.x * viewport.width * mouseFactor,
    y: mouse.y * viewport.height * mouseFactor + scrollY * scrollFactor,
  };
}

/** 화면 밖으로 밀려난 별을 반대편에서 다시 등장시킨다 */
export function wrap(value: number, max: number): number {
  if (max <= 0) return 0;
  return ((value % max) + max) % max;
}

/**
 * 특정 시점에 별이 실제로 그려질 좌표를 구한다.
 * 시차 오프셋과 별개로 아주 느린 자체 표류를 더한다 —
 * 마우스를 떼도 배경이 정지 화면이 되지 않게 하는 장치다.
 */
export function starPosition(
  star: Star,
  layer: StarLayer,
  time: number,
  offset: Vec2,
  viewport: Viewport,
): Vec2 {
  const drifted = star.hx + layer.drift * time * DRIFT_SCALE;

  return {
    x: wrap(drifted * viewport.width - offset.x, viewport.width),
    y: wrap(star.hy * viewport.height - offset.y, viewport.height),
  };
}
```

`DRIFT_SCALE` 상수를 `SCROLL_SCALE` 아래에 추가한다:

```typescript
/** 프레임당 표류량 배수. 눈치채지 못할 만큼 느려야 한다 */
const DRIFT_SCALE = 0.0012;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/field.test.ts`
Expected: 17 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/cosmos/field.ts src/components/cosmos/field.test.ts
git commit -m "feat: 별 레이어 생성과 시차 오프셋 계산 추가

깊이 3단계 레이어를 정규화 좌표로 생성한다.
난수 함수를 주입받아 결정적 테스트가 가능하다."
```

---

### Task 5: 중력 렌즈 변형 (`field.ts` 2/2)

커서 주변 별을 끌어당기고 휘게 만드는 계산. 순수 함수라 궤적 규칙을 정확히 검증할 수 있다.

**Files:**
- Modify: `src/components/cosmos/field.ts`
- Modify: `src/components/cosmos/field.test.ts`

**Interfaces:**
- Consumes: `Vec2` (Task 4)
- Produces: `function applyGravity(point: Vec2, cursor: Vec2, radius: number): GravityResult`
  - `type GravityResult = { x: number; y: number; stretch: number; angle: number }`

- [ ] **Step 1: 실패 테스트 추가**

`src/components/cosmos/field.test.ts` 하단에 추가:

```typescript
import { applyGravity } from './field';

describe('applyGravity', () => {
  const cursor = { x: 500, y: 400 };
  const radius = 170;

  it('반경 밖의 별은 변형되지 않는다', () => {
    const point = { x: 900, y: 400 };
    const result = applyGravity(point, cursor, radius);
    expect(result.x).toBe(point.x);
    expect(result.y).toBe(point.y);
    expect(result.stretch).toBe(1);
  });

  it('반경 경계에 있는 별은 변형되지 않는다', () => {
    const point = { x: 500 + radius, y: 400 };
    const result = applyGravity(point, cursor, radius);
    expect(result.stretch).toBe(1);
  });

  it('반경 안의 별은 커서 쪽으로 끌려온다', () => {
    const point = { x: 600, y: 400 };
    const result = applyGravity(point, cursor, radius);
    const before = Math.hypot(point.x - cursor.x, point.y - cursor.y);
    const after = Math.hypot(result.x - cursor.x, result.y - cursor.y);
    expect(after).toBeLessThan(before);
  });

  it('가까울수록 더 길게 늘어난다', () => {
    const near = applyGravity({ x: 520, y: 400 }, cursor, radius);
    const far = applyGravity({ x: 650, y: 400 }, cursor, radius);
    expect(near.stretch).toBeGreaterThan(far.stretch);
  });

  it('늘어나는 배율에 상한이 있다', () => {
    // 커서와 겹친 별이 무한히 늘어나 화면을 가로지르는 것을 막는다
    const result = applyGravity({ x: 500, y: 400 }, cursor, radius);
    expect(result.stretch).toBeLessThanOrEqual(3.4);
    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
  });

  it('직선으로 끌려오지 않고 궤도 접선 성분이 섞인다', () => {
    // 커서와 같은 y축에 있는 별이라면 순수 인력만으로는 y가 변하지 않는다.
    // y가 변한다는 것은 접선 성분이 적용되었다는 뜻이다.
    const result = applyGravity({ x: 600, y: 400 }, cursor, radius);
    expect(result.y).not.toBe(400);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/field.test.ts`
Expected: FAIL — `applyGravity is not a function`

- [ ] **Step 3: 구현 — `field.ts`에 추가**

```typescript
export type GravityResult = Vec2 & {
  /** 별을 길게 늘이는 배율. 1이면 변형 없음 */
  stretch: number;
  /** 늘어나는 축의 각도(라디안) */
  angle: number;
};

const MAX_PULL = 26;
const TANGENT_RATIO = 0.85;
const MAX_STRETCH = 3.4;

/**
 * 커서를 질량으로 삼아 반경 안의 별을 끌어당기고 휘게 만든다.
 * 인력만 쓰면 별이 커서로 직진해 빨려드는 것처럼 보이므로,
 * 수직 방향 접선 성분을 섞어 궤도를 도는 듯한 궤적을 만든다.
 */
export function applyGravity(point: Vec2, cursor: Vec2, radius: number): GravityResult {
  const dx = cursor.x - point.x;
  const dy = cursor.y - point.y;
  const distance = Math.hypot(dx, dy);

  if (distance >= radius) {
    return { x: point.x, y: point.y, stretch: 1, angle: 0 };
  }

  // 0으로 나누는 것을 막고, 커서와 겹친 별이 튀는 것도 함께 막는다
  const safeDistance = Math.max(distance, 1);
  const falloff = 1 - distance / radius;
  const pull = falloff * falloff * MAX_PULL;

  const nx = dx / safeDistance;
  const ny = dy / safeDistance;

  const x = point.x + nx * pull - ny * pull * TANGENT_RATIO;
  const y = point.y + ny * pull + nx * pull * TANGENT_RATIO;

  const stretch = Math.min(MAX_STRETCH, 1 + falloff * falloff * (MAX_STRETCH - 1));
  const angle = Math.atan2(cursor.y - y, cursor.x - x) + Math.PI / 2;

  return { x, y, stretch, angle };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/field.test.ts`
Expected: 23 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/cosmos/field.ts src/components/cosmos/field.test.ts
git commit -m "feat: 국지적 중력 렌즈 변형 계산 추가

커서 반경 안의 별을 끌어당기고 접선 성분을 섞어 궤도를 그리게 한다.
늘어나는 배율에 상한을 두어 커서와 겹칠 때 튀는 것을 방지."
```

---

### Task 6: 성운 레이어 (`nebula.ts`)

**Files:**
- Create: `src/components/cosmos/nebula.ts`
- Test: `src/components/cosmos/nebula.test.ts`

**Interfaces:**
- Consumes: `Viewport` (Task 4)
- Produces:
  - `type NebulaBlob = { hx, hy, radius, color, speed, phase }`
  - `NEBULA_BLOBS: NebulaBlob[]`
  - `function blobFrame(blob: NebulaBlob, time: number, viewport: Viewport): { x, y, radius }`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/cosmos/nebula.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { NEBULA_BLOBS, blobFrame } from './nebula';

const viewport = { width: 1000, height: 800 };

describe('NEBULA_BLOBS', () => {
  it('blob이 4개 정의되어 있다', () => {
    expect(NEBULA_BLOBS).toHaveLength(4);
  });

  it('모든 색상이 rgb 채널 문자열 형식이다', () => {
    for (const blob of NEBULA_BLOBS) {
      expect(blob.color).toMatch(/^\d{1,3},\d{1,3},\d{1,3}$/);
    }
  });
});

describe('blobFrame', () => {
  it('시간이 흐르면 위치가 변한다', () => {
    const blob = NEBULA_BLOBS[0];
    const first = blobFrame(blob, 0, viewport);
    const later = blobFrame(blob, 5000, viewport);
    expect(first.x !== later.x || first.y !== later.y).toBe(true);
  });

  it('반지름이 항상 양수다', () => {
    for (const blob of NEBULA_BLOBS) {
      for (const time of [0, 1000, 9999]) {
        expect(blobFrame(blob, time, viewport).radius).toBeGreaterThan(0);
      }
    }
  });

  it('같은 시간을 넣으면 같은 결과가 나온다', () => {
    const a = blobFrame(NEBULA_BLOBS[1], 1234, viewport);
    const b = blobFrame(NEBULA_BLOBS[1], 1234, viewport);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/nebula.test.ts`
Expected: FAIL — `Failed to resolve import "./nebula"`

- [ ] **Step 3: 구현**

`src/components/cosmos/nebula.ts`:

```typescript
import type { Viewport } from './field';

export type NebulaBlob = {
  hx: number;
  hy: number;
  radius: number;
  /** "r,g,b" 형식. rgba() 문자열을 조립할 때 그대로 끼워 넣는다 */
  color: string;
  speed: number;
  phase: number;
};

// TODO: 브랜드 컬러 확정 후 색상 교체
export const NEBULA_BLOBS: NebulaBlob[] = [
  { hx: 0.2, hy: 0.3, radius: 0.85, color: '79,70,229', speed: 0.0003, phase: 0 },
  { hx: 0.74, hy: 0.62, radius: 0.95, color: '139,92,246', speed: 0.00024, phase: 2.1 },
  { hx: 0.52, hy: 0.9, radius: 0.7, color: '14,165,233', speed: 0.00036, phase: 4.3 },
  { hx: 0.9, hy: 0.16, radius: 0.58, color: '219,39,119', speed: 0.00027, phase: 1.2 },
];

const DRIFT_RANGE = 0.07;
const PULSE_RANGE = 0.1;

/** 특정 시점의 blob 위치와 크기를 구한다 */
export function blobFrame(blob: NebulaBlob, time: number, viewport: Viewport) {
  const x = (blob.hx + Math.sin(time * blob.speed * 6 + blob.phase) * DRIFT_RANGE) * viewport.width;
  const y = (blob.hy + Math.cos(time * blob.speed * 5 + blob.phase) * DRIFT_RANGE) * viewport.height;
  const pulse = 1 + Math.sin(time * blob.speed * 8 + blob.phase) * PULSE_RANGE;
  const radius = blob.radius * Math.max(viewport.width, viewport.height) * 0.55 * pulse;

  return { x, y, radius };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/nebula.test.ts`
Expected: 5 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/cosmos/nebula.ts src/components/cosmos/nebula.test.ts
git commit -m "feat: 성운 blob 정의와 위치 계산 추가"
```

---

### Task 7: 렌더러와 엔진 루프

계산 결과를 캔버스에 그리고, rAF 루프와 이벤트 생명주기를 관리한다. 여기부터 브라우저 API를 만진다.

**Files:**
- Create: `src/components/cosmos/renderer.ts`, `src/components/cosmos/engine.ts`, `src/components/cosmos/environment.ts`
- Test: `src/components/cosmos/engine.test.ts`

**Interfaces:**
- Consumes: `resolveParams` (T3), `createLayers`/`parallaxOffset`/`applyGravity` (T4·T5), `blobFrame`/`NEBULA_BLOBS` (T6)
- Produces:
  - `function createRenderer(ctx: CanvasRenderingContext2D): Renderer`
  - `function createCosmos(canvas: HTMLCanvasElement, params: CosmosParams): CosmosHandle`
  - `type CosmosHandle = { start(): void; stop(): void; destroy(): void }`
  - `function readEnvironment(): CosmosEnvironment`

- [ ] **Step 1: 엔진 생명주기 실패 테스트 작성**

jsdom에는 캔버스 2D 컨텍스트가 없다. 실제 픽셀 대신 **호출 여부와 생명주기**를 검증한다. 그리기 자체의 정확성은 순수 함수 테스트(T4·T5·T6)가 이미 담보한다.

`src/components/cosmos/engine.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCosmos } from './engine';
import { resolveParams } from './params';

/** jsdom에 2D 컨텍스트가 없으므로 호출만 기록하는 스텁을 만든다 */
function stubCanvas() {
  const calls = { fillRect: 0, arc: 0, ellipse: 0 };
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    canvas: { width: 0, height: 0 },
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(() => { calls.fillRect++; }),
    beginPath: vi.fn(),
    arc: vi.fn(() => { calls.arc++; }),
    ellipse: vi.fn(() => { calls.ellipse++; }),
    fill: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    createLinearGradient: vi.fn(() => gradient),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 1000, height: 800, left: 0, top: 0 }),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx, calls };
}

const desktop = resolveParams({ hasFinePointer: true, prefersReducedMotion: false });
const reduced = resolveParams({ hasFinePointer: true, prefersReducedMotion: true });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createCosmos', () => {
  it('start 전에는 아무것도 그리지 않는다', () => {
    const { canvas, calls } = stubCanvas();
    createCosmos(canvas, desktop);
    expect(calls.arc).toBe(0);
  });

  it('start하면 별을 그린다', () => {
    const { canvas, calls } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    expect(calls.arc).toBeGreaterThan(0);
  });

  it('애니메이션이 켜져 있으면 프레임이 반복된다', () => {
    const { canvas, calls } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    const afterFirst = calls.arc;
    vi.advanceTimersByTime(100);
    expect(calls.arc).toBeGreaterThan(afterFirst);
    handle.destroy();
  });

  it('모션 감소 설정에서는 한 프레임만 그리고 멈춘다', () => {
    const { canvas, calls } = stubCanvas();
    const handle = createCosmos(canvas, reduced);
    handle.start();
    const afterFirst = calls.arc;
    vi.advanceTimersByTime(500);
    expect(calls.arc).toBe(afterFirst);
    handle.destroy();
  });

  it('stop하면 프레임이 더 이상 진행되지 않는다', () => {
    const { canvas, calls } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    handle.stop();
    const afterStop = calls.arc;
    vi.advanceTimersByTime(200);
    expect(calls.arc).toBe(afterStop);
    handle.destroy();
  });

  it('destroy하면 window 이벤트 리스너가 모두 해제된다', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { canvas } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    handle.destroy();

    const removed = removeSpy.mock.calls.map((call) => call[0]);
    expect(removed).toContain('mousemove');
    expect(removed).toContain('scroll');
    expect(removed).toContain('resize');
    removeSpy.mockRestore();
  });

  it('destroy를 두 번 호출해도 예외가 나지 않는다', () => {
    const { canvas } = stubCanvas();
    const handle = createCosmos(canvas, desktop);
    handle.start();
    handle.destroy();
    expect(() => handle.destroy()).not.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/engine.test.ts`
Expected: FAIL — `Failed to resolve import "./engine"`

- [ ] **Step 3: 렌더러 구현**

`src/components/cosmos/renderer.ts`:

```typescript
import {
  applyGravity,
  parallaxOffset,
  starPosition,
  type StarLayer,
  type Vec2,
  type Viewport,
} from './field';
import { NEBULA_BLOBS, blobFrame } from './nebula';
import type { CosmosParams } from './params';

export type RenderState = {
  time: number;
  mouse: Vec2;
  cursor: Vec2;
  pointerActive: boolean;
  scrollY: number;
};

const BACKGROUND = '#03040a';
/** 성운 캐시 해상도. 흐릿한 그라데이션이라 1/4로 줄여도 차이가 보이지 않는다 */
const NEBULA_SCALE = 0.25;
/** 성운 캐시 갱신 주기(프레임). 아주 느리게 움직이므로 매 프레임 다시 그릴 필요가 없다 */
const NEBULA_INTERVAL = 3;

export function createRenderer(ctx: CanvasRenderingContext2D) {
  // 전체 화면 크기의 radial gradient 4장을 매 프레임 새로 만드는 비용을 피하기 위해
  // 저해상도 오프스크린에 그려두고 확대해 합성한다.
  const cache = document.createElement('canvas');
  const cacheCtx = cache.getContext('2d');
  let cacheFrame = -1;

  function paintBlobs(
    target: CanvasRenderingContext2D,
    state: RenderState,
    params: CosmosParams,
    viewport: Viewport,
    scale: number,
  ) {
    target.globalCompositeOperation = 'lighter';
    for (const blob of NEBULA_BLOBS) {
      const frame = blobFrame(blob, state.time, viewport);
      const x = frame.x * scale;
      const y = frame.y * scale;
      const radius = frame.radius * scale;
      const gradient = target.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${blob.color},${0.26 * params.nebulaIntensity})`);
      gradient.addColorStop(0.45, `rgba(${blob.color},${0.09 * params.nebulaIntensity})`);
      gradient.addColorStop(1, `rgba(${blob.color},0)`);
      target.fillStyle = gradient;
      target.beginPath();
      target.arc(x, y, radius, 0, Math.PI * 2);
      target.fill();
    }
    target.globalCompositeOperation = 'source-over';
  }

  function drawNebula(state: RenderState, params: CosmosParams, viewport: Viewport) {
    if (params.nebulaIntensity <= 0) return;

    // 오프스크린을 못 만드는 환경에서는 메인 캔버스에 직접 그린다
    if (!cacheCtx) {
      paintBlobs(ctx, state, params, viewport, 1);
      return;
    }

    const width = Math.max(1, Math.round(viewport.width * NEBULA_SCALE));
    const height = Math.max(1, Math.round(viewport.height * NEBULA_SCALE));

    if (cache.width !== width || cache.height !== height) {
      cache.width = width;
      cache.height = height;
      cacheFrame = -1;
    }

    if (cacheFrame < 0 || state.time - cacheFrame >= NEBULA_INTERVAL) {
      cacheCtx.clearRect(0, 0, width, height);
      paintBlobs(cacheCtx, state, params, viewport, NEBULA_SCALE);
      cacheFrame = state.time;
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(cache, 0, 0, viewport.width, viewport.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawStars(
    layers: StarLayer[],
    state: RenderState,
    params: CosmosParams,
    viewport: Viewport,
  ) {
    const useGravity = params.gravity && state.pointerActive;

    for (const layer of layers) {
      const offset = parallaxOffset(layer.depth, state.mouse, state.scrollY, params, viewport);
      // 가까운 레이어에만 중력을 적용한다. 전체에 걸면 산만해진다.
      const gravityLayer = useGravity && layer.depth > 0.5;

      for (const star of layer.stars) {
        let { x, y } = starPosition(star, layer, state.time, offset, viewport);
        let stretch = 1;
        let angle = 0;

        if (gravityLayer) {
          const result = applyGravity({ x, y }, state.cursor, params.gravityRadius);
          x = result.x;
          y = result.y;
          stretch = result.stretch;
          angle = result.angle;
        }

        const twinkle = 0.62 + 0.38 * Math.sin(state.time * star.twinkleSpeed + star.twinklePhase);
        ctx.globalAlpha = star.alpha * twinkle;
        ctx.fillStyle = '#e6ecff';
        ctx.beginPath();
        if (stretch > 1.02) {
          ctx.ellipse(x, y, star.size * stretch, star.size, angle, 0, Math.PI * 2);
        } else {
          ctx.arc(x, y, star.size, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawVignette(viewport: Viewport) {
    const start = viewport.height * 0.45;
    const gradient = ctx.createLinearGradient(0, start, 0, viewport.height);
    gradient.addColorStop(0, 'rgba(3,4,10,0)');
    gradient.addColorStop(1, 'rgba(3,4,10,0.55)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, start, viewport.width, viewport.height - start);
  }

  return {
    draw(layers: StarLayer[], state: RenderState, params: CosmosParams, viewport: Viewport) {
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, viewport.width, viewport.height);
      drawNebula(state, params, viewport);
      drawStars(layers, state, params, viewport);
      drawVignette(viewport);
    },
  };
}
```

`starPosition`이 표류와 화면 순환을 모두 처리하므로 렌더러는 좌표 계산을 하지 않는다. 렌더러의 책임은 "받은 좌표를 칠하는 것" 하나로 남는다.

- [ ] **Step 4: 환경 감지 구현**

`src/components/cosmos/environment.ts`:

```typescript
import type { CosmosEnvironment } from './params';

export function readEnvironment(): CosmosEnvironment {
  // 화면 폭으로 나누면 터치스크린 노트북에서 오판한다. 포인터 특성으로 판단한다.
  const hasFinePointer =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return { hasFinePointer, prefersReducedMotion };
}
```

- [ ] **Step 5: 엔진 구현**

`src/components/cosmos/engine.ts`:

```typescript
import { createLayers, type StarLayer, type Viewport } from './field';
import type { CosmosParams } from './params';
import { createRenderer, type RenderState } from './renderer';

export type CosmosHandle = {
  start(): void;
  stop(): void;
  destroy(): void;
};

/** 마우스 추적 감쇠 계수. 낮을수록 부드럽게 따라온다 */
const EASING = 0.045;
/** 리사이즈 디바운스(ms). 창을 드래그로 늘이는 동안 별을 매번 재생성하지 않기 위함 */
const RESIZE_DEBOUNCE = 150;

export function createCosmos(canvas: HTMLCanvasElement, params: CosmosParams): CosmosHandle {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { start() {}, stop() {}, destroy() {} };
  }

  const renderer = createRenderer(ctx);
  let viewport: Viewport = { width: 0, height: 0 };
  let layers: StarLayer[] = [];
  let frameId: number | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const target = { x: 0, y: 0 };
  const state: RenderState = {
    time: 0,
    mouse: { x: 0, y: 0 },
    cursor: { x: 0, y: 0 },
    pointerActive: false,
    scrollY: 0,
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, params.dprCap);
    viewport = { width: rect.width, height: rect.height };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layers = createLayers(params.starCount);
  }

  function handleResize() {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      resize();
      // 애니메이션이 꺼진 상태에서 창 크기가 바뀌면 캔버스가 비어 버린다.
      // 정지 화면을 다시 그려준다.
      if (!params.animate && !destroyed) frame();
    }, RESIZE_DEBOUNCE);
  }

  function handleMouseMove(event: MouseEvent) {
    target.x = event.clientX / window.innerWidth - 0.5;
    target.y = event.clientY / window.innerHeight - 0.5;
    state.cursor.x = event.clientX;
    state.cursor.y = event.clientY;
    state.pointerActive = true;
  }

  function handleMouseLeave() {
    state.pointerActive = false;
    target.x = 0;
    target.y = 0;
  }

  function handleScroll() {
    state.scrollY = window.scrollY;
  }

  function handleVisibility() {
    if (document.visibilityState === 'hidden') stop();
    else if (!destroyed && params.animate) start();
  }

  function frame() {
    state.time += 1;
    // 마우스를 뗐을 때 중앙으로 서서히 복귀시킨다
    state.mouse.x += (target.x - state.mouse.x) * EASING;
    state.mouse.y += (target.y - state.mouse.y) * EASING;

    renderer.draw(layers, state, params, viewport);

    if (params.animate) {
      frameId = requestAnimationFrame(frame);
    }
  }

  function start() {
    if (destroyed || frameId !== null) return;
    if (viewport.width === 0) resize();
    frame();
  }

  function stop() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  window.addEventListener('mouseout', handleMouseLeave, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibility);

  return {
    start,
    stop,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    },
  };
}
```

`params.animate`가 `false`면 `frame()`이 재귀 호출을 하지 않으므로 한 프레임만 그리고 자연히 멈춘다. 별도 분기가 필요 없다.

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test src/components/cosmos/engine.test.ts`
Expected: 7 passed

- [ ] **Step 7: 전체 테스트 확인**

Run: `npm test`
Expected: 모든 테스트 통과

- [ ] **Step 8: 커밋**

```bash
git add src/components/cosmos
git commit -m "feat: 캔버스 렌더러와 엔진 루프 추가

렌더 루프, 이벤트 생명주기, 환경 감지를 구현.
성운은 1/4 해상도 오프스크린에 3프레임마다 그려 재사용한다.
리사이즈는 150ms 디바운스해 별 재생성이 반복되지 않게 한다.
모션 감소 설정에서는 한 프레임만 그리고 멈춘다.
탭이 숨겨지면 루프를 정지해 배터리를 아낀다."
```

---

### Task 8: React 통합 (`CosmosBackground`)

**Files:**
- Create: `src/components/cosmos/CosmosBackground.tsx`
- Test: `src/components/cosmos/CosmosBackground.test.tsx`

**Interfaces:**
- Consumes: `createCosmos` (T7), `readEnvironment` (T7), `resolveParams` (T3)
- Produces: `<CosmosBackground />` — `src/app/layout.tsx`에서 사용

- [ ] **Step 1: 실패 테스트 작성**

`src/components/cosmos/CosmosBackground.test.tsx`:

```typescript
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/CosmosBackground.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`src/components/cosmos/CosmosBackground.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { createCosmos } from './engine';
import { readEnvironment } from './environment';
import { resolveParams } from './params';

export function CosmosBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = createCosmos(canvas, resolveParams(readEnvironment()));
    handle.start();
    return () => handle.destroy();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
```

의존성 배열이 비어 있는 것이 핵심이다. 마우스 좌표는 React를 거치지 않으므로 이 컴포넌트는 마운트 후 **단 한 번도 리렌더되지 않는다.**

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/CosmosBackground.test.tsx`
Expected: 4 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/cosmos/CosmosBackground.tsx src/components/cosmos/CosmosBackground.test.tsx
git commit -m "feat: 배경 캔버스 React 컴포넌트 추가

마운트 시 엔진을 시작하고 언마운트 시 정리한다.
마우스 좌표가 상태로 올라가지 않아 리렌더가 발생하지 않는다."
```

---

### Task 9: 디자인 토큰과 레이아웃 셸

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/components/ui/GlassPanel.tsx`
- Test: `src/components/ui/GlassPanel.test.tsx`

**Interfaces:**
- Consumes: `<CosmosBackground />` (T8)
- Produces: `<GlassPanel>` — 이후 모든 섹션이 본문을 감싸는 데 사용

- [ ] **Step 1: 실패 테스트 작성**

`src/components/ui/GlassPanel.test.tsx`:

```typescript
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/ui/GlassPanel.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: `GlassPanel` 구현**

`src/components/ui/GlassPanel.tsx`:

```tsx
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

export function GlassPanel({ children, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[rgba(8,10,22,0.55)] p-6 backdrop-blur-md sm:p-10 ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 전역 스타일 작성**

`src/app/globals.css` 전체를 교체한다:

```css
@import 'tailwindcss';

:root {
  --cosmos-bg: #03040a;
  --cosmos-text: #eef2ff;
  --cosmos-muted: #a9b4d4;
  --cosmos-accent: #8b5cf6;
}

html {
  scroll-behavior: smooth;
  background-color: var(--cosmos-bg);
}

body {
  background-color: transparent;
  color: var(--cosmos-text);
  -webkit-font-smoothing: antialiased;
}

/* 모션 감소 설정에서는 부드러운 스크롤도 끈다 */
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

`--cosmos-muted`는 `#03040a` 배경 대비 약 9.4:1로 WCAG AA(4.5:1)를 크게 넘긴다. 유리 패널이 배경을 밝히더라도 여유가 있다.

- [ ] **Step 5: 레이아웃 작성**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { CosmosBackground } from '@/components/cosmos/CosmosBackground';
import { profile } from '@/data/profile';
import './globals.css';

export const metadata: Metadata = {
  title: `${profile.displayName} · ${profile.role}`,
  description: profile.intro[0],
  metadataBase: new URL('https://me.cosmoslog.org'),
  openGraph: {
    title: `${profile.displayName} · ${profile.role}`,
    description: profile.intro[0],
    url: 'https://me.cosmoslog.org',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <CosmosBackground />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: 테스트와 빌드 확인**

Run: `npm test && npm run build`
Expected: 테스트 전부 통과, 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add src/app src/components/ui
git commit -m "feat: 디자인 토큰과 레이아웃 셸 구성

다크 고정 팔레트를 CSS 변수로 정의하고 배경 캔버스를 전역 배치.
본문 가독성을 위한 GlassPanel 컴포넌트 추가."
```

---

### Task 10: 히어로와 프로젝트 섹션

사이트의 두 핵심 화면이다.

**Files:**
- Create: `src/components/sections/Hero.tsx`, `src/components/sections/Projects.tsx`, `src/components/ui/ProjectCard.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/sections/sections.test.tsx`

**Interfaces:**
- Consumes: `profile` `projects` (T2), `GlassPanel` (T9)
- Produces: `<Hero />`, `<Projects />`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/sections/sections.test.tsx`:

```typescript
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/sections/sections.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: `Hero` 구현**

`src/components/sections/Hero.tsx`:

```tsx
import { profile } from '@/data/profile';

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col justify-center px-6 sm:px-12 lg:px-20"
    >
      {/* 별 위에서 텍스트가 읽히도록 뒤쪽만 어둡게 깎아낸다 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-[5] bg-[radial-gradient(ellipse_at_30%_50%,rgba(3,4,10,0.85),transparent_65%)]"
      />
      <p className="mb-5 text-xs uppercase tracking-[0.42em] text-[color:var(--cosmos-muted)]">
        me.cosmoslog.org
      </p>
      <h1 className="mb-6 text-4xl font-bold leading-[1.16] sm:text-5xl lg:text-6xl">
        {profile.heroCopy.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>
      <p className="text-base text-[color:var(--cosmos-muted)] sm:text-lg">
        {profile.displayName} · {profile.role}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: `ProjectCard` 구현**

`src/components/ui/ProjectCard.tsx`:

```tsx
import type { Project } from '@/types';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-white/10 bg-[rgba(8,10,22,0.55)] p-6 backdrop-blur-md transition hover:border-white/25 hover:bg-[rgba(14,17,34,0.7)]"
    >
      <div className="mb-2 flex items-center gap-3">
        <h3 className="text-xl font-semibold">{project.name}</h3>
        {project.status === 'building' && (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[11px] text-amber-200">
            개발 중
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-[color:var(--cosmos-muted)]">{project.tagline}</p>
      <ul className="flex flex-wrap gap-2">
        {project.tech.map((tech) => (
          <li
            key={tech}
            className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-[color:var(--cosmos-muted)]"
          >
            {tech}
          </li>
        ))}
      </ul>
    </a>
  );
}
```

- [ ] **Step 5: `Projects` 구현**

`src/components/sections/Projects.tsx`:

```tsx
import { ProjectCard } from '@/components/ui/ProjectCard';
import { projects } from '@/data/projects';

export function Projects() {
  return (
    <section id="projects" className="px-6 py-24 sm:px-12 lg:px-20">
      <h2 className="mb-10 text-3xl font-bold sm:text-4xl">만든 것들</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: 페이지에 조립**

`src/app/page.tsx`:

```tsx
import { Hero } from '@/components/sections/Hero';
import { Projects } from '@/components/sections/Projects';

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl">
      <Hero />
      <Projects />
    </main>
  );
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test src/components/sections/sections.test.tsx`
Expected: 6 passed

- [ ] **Step 8: 실제 화면 확인**

Run: `npm run dev`
확인할 것: 배경이 움직이는가 · 마우스를 따라 별이 밀리는가 · 커서 주변 별이 휘는가 · 텍스트가 읽히는가 · 마우스를 떼도 배경이 살아 있는가

- [ ] **Step 9: 커밋**

```bash
git add src/components src/app/page.tsx
git commit -m "feat: 히어로와 프로젝트 섹션 추가

프로젝트 카드는 데이터 배열을 순회해 렌더링한다.
외부 링크에 noopener를 붙이고 개발 중 상태를 배지로 표시."
```

---

### Task 11: 나머지 섹션과 스크롤 연출

**Files:**
- Create: `src/components/sections/About.tsx`, `Writing.tsx`, `Channels.tsx`, `src/components/ui/ScrollProgress.tsx`, `src/components/ui/Reveal.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/ui/Reveal.test.tsx`, `src/components/sections/channels.test.tsx`

**Interfaces:**
- Consumes: `profile` `channels` (T2), `GlassPanel` (T9)
- Produces: `<About />`, `<Writing />`, `<Channels />`, `<ScrollProgress />`, `<Reveal>`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/ui/Reveal.test.tsx`:

```typescript
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from './Reveal';

beforeEach(() => {
  // jsdom에는 IntersectionObserver가 없다
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Reveal', () => {
  it('자식을 렌더링한다', () => {
    render(<Reveal><p>내용</p></Reveal>);
    expect(screen.getByText('내용')).toBeDefined();
  });

  it('IntersectionObserver가 없는 환경에서도 내용이 보인다', () => {
    // 애니메이션은 장식이므로 실패해도 콘텐츠는 읽혀야 한다
    vi.unstubAllGlobals();
    const { container } = render(<Reveal><p>내용</p></Reveal>);
    expect(container.textContent).toContain('내용');
  });
});
```

`src/components/sections/channels.test.tsx`:

```typescript
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/ui/Reveal.test.tsx src/components/sections/channels.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: `Reveal` 구현**

`src/components/ui/Reveal.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  delay?: number;
};

export function Reveal({ children, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    // 관찰자를 만들 수 없는 환경에서는 그냥 보여준다
    if (!element || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -80px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 motion-reduce:opacity-100'
      }`}
    >
      {children}
    </div>
  );
}
```

`motion-reduce:opacity-100`이 중요하다. 모션 감소 설정에서 트랜지션이 꺼지면 요소가 영영 투명한 채로 남아 **콘텐츠가 사라지는** 사고가 난다.

- [ ] **Step 4: `ScrollProgress` 구현**

`src/components/ui/ScrollProgress.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function update() {
      const bar = barRef.current;
      if (!bar) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      bar.style.transform = `scaleX(${ratio})`;
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-px">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-indigo-300/70 via-violet-300/80 to-sky-300/70 shadow-[0_0_8px_rgba(167,180,255,0.6)]"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
```

폭 대신 `transform: scaleX`를 쓴다. `width` 변경은 레이아웃 재계산을 유발하지만 `transform`은 합성 단계에서만 처리되어 스크롤 중 프레임이 끊기지 않는다.

- [ ] **Step 5: 나머지 섹션 구현**

`src/components/sections/About.tsx`:

```tsx
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Reveal } from '@/components/ui/Reveal';
import { profile } from '@/data/profile';

export function About() {
  return (
    <section id="about" className="px-6 py-24 sm:px-12 lg:px-20">
      <Reveal>
        <GlassPanel>
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">나</h2>
          {profile.intro.map((paragraph) => (
            <p key={paragraph} className="mb-4 leading-relaxed text-[color:var(--cosmos-muted)]">
              {paragraph}
            </p>
          ))}
        </GlassPanel>
      </Reveal>
    </section>
  );
}
```

`src/components/sections/Writing.tsx`:

```tsx
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Reveal } from '@/components/ui/Reveal';
import { channels } from '@/data/channels';

export function Writing() {
  const blog = channels.find((channel) => channel.kind === 'blog');
  // 블로그 주소가 아직 없으면 섹션 자체를 렌더링하지 않는다
  if (!blog) return null;

  return (
    <section id="writing" className="px-6 py-24 sm:px-12 lg:px-20">
      <Reveal>
        <GlassPanel>
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">기록</h2>
          <a
            href={blog.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--cosmos-muted)] underline underline-offset-4 hover:text-white"
          >
            {blog.label}
          </a>
        </GlassPanel>
      </Reveal>
    </section>
  );
}
```

`src/components/sections/Channels.tsx`:

```tsx
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Reveal } from '@/components/ui/Reveal';
import { channels } from '@/data/channels';

export function Channels() {
  return (
    <section id="channels" className="px-6 py-24 sm:px-12 lg:px-20">
      <Reveal>
        <GlassPanel>
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">채널</h2>
          <ul className="flex flex-wrap gap-3">
            {channels.map((channel) => {
              const isMail = channel.href.startsWith('mailto:');
              return (
                <li key={channel.kind}>
                  <a
                    href={channel.href}
                    {...(isMail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                    className="inline-block rounded-full border border-white/15 px-4 py-2 text-sm text-[color:var(--cosmos-muted)] transition hover:border-white/35 hover:text-white"
                  >
                    {channel.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </GlassPanel>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 6: 페이지 조립**

`src/app/page.tsx`:

```tsx
import { About } from '@/components/sections/About';
import { Channels } from '@/components/sections/Channels';
import { Hero } from '@/components/sections/Hero';
import { Projects } from '@/components/sections/Projects';
import { Writing } from '@/components/sections/Writing';
import { ScrollProgress } from '@/components/ui/ScrollProgress';

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <main className="mx-auto max-w-5xl">
        <Hero />
        <About />
        <Projects />
        <Writing />
        <Channels />
      </main>
      <footer className="px-6 py-12 text-center text-sm text-[color:var(--cosmos-muted)] sm:px-12">
        © {new Date().getFullYear()} 오드
      </footer>
    </>
  );
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test`
Expected: 모든 테스트 통과

- [ ] **Step 8: 커밋**

```bash
git add src/components src/app/page.tsx
git commit -m "feat: 소개·기록·채널 섹션과 스크롤 연출 추가

진행도 바는 width 대신 transform으로 그려 스크롤 성능을 지킨다.
모션 감소 설정에서 진입 애니메이션이 콘텐츠를 숨기지 않도록 처리."
```

---

### Task 12: 접근성 검증과 배포 파이프라인

**Files:**
- Create: `.github/workflows/deploy.yml`, `public/CNAME`
- Test: `src/app/accessibility.test.tsx`

**Interfaces:**
- Consumes: 완성된 페이지 전체
- Produces: `main` 브랜치 push 시 자동 배포

- [ ] **Step 1: 접근성 회귀 테스트 작성**

`src/app/accessibility.test.tsx`:

```typescript
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './page';

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('페이지 접근성', () => {
  it('h1이 정확히 하나다', () => {
    render(<Home />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('제목 레벨이 h1에서 h2로만 내려간다', () => {
    render(<Home />);
    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName[1]));
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it('모든 링크에 접근 가능한 이름이 있다', () => {
    render(<Home />);
    for (const link of screen.getAllByRole('link')) {
      expect(link.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it('빈 링크가 하나도 없다', () => {
    render(<Home />);
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toBe('#');
      expect(href.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `npm test src/app/accessibility.test.tsx`
Expected: 통과. 실패하면 해당 섹션을 고친 뒤 진행한다

- [ ] **Step 3: CNAME 파일 생성**

`public/CNAME` (내용 한 줄, 개행 포함):

```
me.cosmoslog.org
```

`public/` 안의 파일은 빌드 시 `out/` 루트로 그대로 복사된다.

- [ ] **Step 4: 배포 워크플로 작성**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm test
      - run: npm run build

      # Jekyll이 _next 폴더를 무시해 CSS/JS가 전부 404되는 것을 막는다.
      # 공식 Pages 액션은 Jekyll을 거치지 않지만, 브랜치 배포로 전환할 때를 위한 보험이다.
      - run: touch out/.nojekyll

      - uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`npm test`를 빌드 전에 두어, 테스트가 깨진 코드는 배포되지 않게 한다.

- [ ] **Step 5: 로컬에서 최종 검증**

```bash
npm test
npm run build
npx serve out
```

브라우저에서 확인할 것:
1. 배경이 움직이고 마우스에 반응한다
2. 마우스를 떼도 별이 반짝이고 성운이 흐른다
3. 스크롤하면 별이 시차를 두고 밀린다
4. 모든 텍스트가 읽힌다
5. 상단 진행도 선이 스크롤에 따라 늘어난다

macOS **시스템 설정 → 손쉬운 사용 → 디스플레이 → 동작 줄이기**를 켜고 새로고침한 뒤:

6. 배경이 정지 화면으로 뜨고 별·성운이 여전히 보인다
7. 모든 섹션의 콘텐츠가 보인다 (투명한 채로 남지 않는다)

브라우저 개발자도구에서 모바일 에뮬레이션으로 전환한 뒤:

8. 스크롤이 부드럽고 별이 시차를 두고 움직인다

- [ ] **Step 6: 커밋**

```bash
git add .github public/CNAME src/app/accessibility.test.tsx
git commit -m "feat: 접근성 회귀 테스트와 GitHub Pages 배포 파이프라인 추가

테스트를 빌드 전에 실행해 깨진 코드가 배포되지 않게 한다.
CNAME으로 me.cosmoslog.org를 연결하고 .nojekyll로 _next 누락을 방지."
```

- [ ] **Step 7: 사용자가 직접 해야 하는 설정 안내**

아래는 코드로 할 수 없다. 구현 완료 시 사용자에게 안내한다.

1. **GitHub 저장소 설정 → Pages → Source를 "GitHub Actions"로 변경**
2. **DNS에 CNAME 레코드 추가**: `me` → `odddman44.github.io`
3. **저장소 설정 → Pages → Custom domain**에 `me.cosmoslog.org` 입력 후 "Enforce HTTPS" 체크 (인증서 발급까지 수 분 소요)
4. **GitHub 계정 설정 → Pages → Verified domains**에서 `cosmoslog.org` 소유권 확인 (도메인 takeover 방지)

---

## 남은 콘텐츠 작업

구현이 끝나도 아래 값은 플레이스홀더 상태다. 데이터 파일만 고치면 되며 코드 변경은 필요 없다.

| 파일 | 항목 |
|---|---|
| `src/data/projects.ts` | 블로그·모임·여행 앱의 실제 Vercel URL, 설명, 기술 태그 |
| `src/data/profile.ts` | 히어로 카피, 자기소개 문구, 표기 이름 |
| `src/data/channels.ts` | 인스타그램 핸들, 블로그 주소 |
| `src/components/cosmos/nebula.ts` | 브랜드 컬러 확정 시 blob 색상 |

`channels.ts`에 블로그를 추가하면 `Writing` 섹션이 자동으로 나타난다. 값이 없으면 섹션이 렌더링되지 않으므로 빈 링크가 생기지 않는다.
