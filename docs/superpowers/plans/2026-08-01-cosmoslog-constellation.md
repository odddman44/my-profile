# cosmoslog 성좌 재설계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스크롤 기반 포트폴리오 페이지를 버리고, 워프 오프닝으로 진입해 궤도를 회전시키며 탐험하는 성좌형 인터랙티브 페이지로 재작성한다.

**Architecture:** 좌표 계산(페이즈 전이·워프 투영·궤도 배치·회전)은 브라우저 API를 모르는 순수 TypeScript 모듈로 분리해 단위 테스트한다. 캔버스는 배경·워프·궤도선만 그리는 장식 레이어이고, **별과 패널은 진짜 DOM**이라 키보드·스크린리더·검색엔진이 그대로 인식한다. 엔진은 매 프레임 DOM 요소의 `transform`을 직접 써서 궤도 위에 배치하므로 React 리렌더는 발생하지 않는다.

**Tech Stack:** Next.js 16 (App Router, static export) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Vitest + jsdom + React Testing Library

## Global Constraints

모든 태스크의 요구사항에 아래가 암묵적으로 포함된다.

- **정적 배포**: `output: 'export'`. 서버 런타임 기능 금지
- **다크 테마 고정**: 라이트 모드 분기·토글을 만들지 않는다
- **빈 링크 금지**: `href="#"`, 빈 문자열 href, href 없는 `<a>` 모두 금지
- **별과 패널은 DOM이다.** 캔버스에 그린 그림으로 링크를 대신하지 않는다. 캔버스는 `aria-hidden="true"`, `pointer-events: none`
- **마우스·궤도 좌표를 React 상태에 넣지 않는다.** `ref` + `requestAnimationFrame`으로만 다룬다. 예외는 "정면에 온 별의 id" 하나뿐이며, 이는 초당 수십 회가 아니라 몇 초에 한 번 바뀐다
- **`prefers-reduced-motion: reduce` 준수는 타협 불가**: 워프 오프닝을 통째로 건너뛰고 성좌부터 시작하며, 자동 회전과 관성을 끈다. 드래그로 직접 돌리는 것은 허용한다 (사용자가 의도한 움직임이므로)
- **터치 타깃 44px 이상**: 별의 시각적 크기와 무관하게 실제 히트 영역을 보장한다
- **JS 없이도 모든 링크가 HTML에 존재한다**
- **외부 링크**: `target="_blank"` + `rel="noopener noreferrer"` 항상 함께
- **코드 스타일**: 들여쓰기 2칸, 변수·함수 camelCase, 컴포넌트 파일만 PascalCase
- **주석은 비즈니스 로직에만 한국어로**. 코드를 읽으면 아는 내용은 주석으로 달지 않는다
- **커밋 메시지는 한국어**, Conventional Commits 접두사 사용
- **작업 브랜치**: `feature/constellation` (이미 생성됨)
- **테스트 명령**: `npm test`

## 파일 구조

| 경로 | 책임 | 상태 |
|---|---|---|
| `src/components/cosmos/field.ts` | 배경 잔별 생성·시차·중력 | 그대로 |
| `src/components/cosmos/nebula.ts` | 성운 blob | 그대로 |
| `src/components/cosmos/environment.ts` | 포인터·모션 설정 감지 | 그대로 |
| `src/components/cosmos/params.ts` | 환경별 렌더 파라미터 | **확장** |
| `src/components/cosmos/phase.ts` | 워프→감속→성좌 상태 전이 — **순수** | 신규 |
| `src/components/cosmos/warp.ts` | 워프 별 전진·재생성·투영 — **순수** | 신규 |
| `src/components/cosmos/orbit.ts` | 궤도 슬롯·좌표·정면 판정·회전 — **순수** | 신규 |
| `src/components/cosmos/renderer.ts` | 캔버스 드로잉 (배경·워프·궤도선) | **개편** |
| `src/components/cosmos/engine.ts` | rAF 루프 · 페이즈 · DOM 위치 갱신 | **개편** |
| `src/components/stage/Stage.tsx` | 클라이언트 루트, 전체 조립 | 신규 |
| `src/components/stage/CoreStar.tsx` | 중심 항성 = DOM `<button>` | 신규 |
| `src/components/stage/StarLink.tsx` | 궤도 별 = DOM `<a>` | 신규 |
| `src/components/stage/StarPanel.tsx` | 패널 | 신규 |
| `src/components/stage/IntroControls.tsx` | 진입 / 건너뛰기 버튼 | 신규 |
| `src/data/*` `src/types/*` | 콘텐츠·타입 | 유지 + 타입 추가 |

**분리 원칙**: `phase.ts` / `warp.ts` / `orbit.ts`는 `window`·`document`·`canvas`를 일절 참조하지 않는다. jsdom 없이 테스트가 돌고, 렌더링 없이 로직 검증이 끝난다.

---

### Task 1: 레거시 화면 제거

스크롤 기반 페이지를 걷어내고 빌드가 통과하는 최소 상태를 만든다. 이후 태스크가 깨끗한 바닥 위에서 시작하게 하는 것이 목적이다.

**Files:**
- Delete: `src/components/sections/Hero.tsx` `About.tsx` `Projects.tsx` `Writing.tsx` `Channels.tsx` `sections.test.tsx` `channels.test.tsx`
- Delete: `src/components/ui/ProjectCard.tsx` `GlassPanel.tsx` `GlassPanel.test.tsx` `Reveal.tsx` `Reveal.test.tsx` `ScrollProgress.tsx`
- Delete: `src/app/accessibility.test.tsx` (Task 13에서 성좌용으로 새로 쓴다)
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 빈 무대. 이후 태스크가 `src/app/page.tsx`에 `<Stage />`를 꽂는다

- [ ] **Step 1: 레거시 파일 삭제**

```bash
git rm src/components/sections/Hero.tsx src/components/sections/About.tsx \
       src/components/sections/Projects.tsx src/components/sections/Writing.tsx \
       src/components/sections/Channels.tsx src/components/sections/sections.test.tsx \
       src/components/sections/channels.test.tsx \
       src/components/ui/ProjectCard.tsx src/components/ui/GlassPanel.tsx \
       src/components/ui/GlassPanel.test.tsx src/components/ui/Reveal.tsx \
       src/components/ui/Reveal.test.tsx src/components/ui/ScrollProgress.tsx \
       src/app/accessibility.test.tsx
```

- [ ] **Step 2: 플레이스홀더 페이지 작성**

`src/app/page.tsx` 전체를 교체한다:

```tsx
import { profile } from '@/data/profile';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-[color:var(--cosmos-muted)]">
        {profile.displayName} · {profile.role}
      </p>
    </main>
  );
}
```

- [ ] **Step 3: 레이아웃에서 noscript 규칙 정리**

`src/app/layout.tsx`의 `<noscript>` 블록은 `[data-reveal]`을 대상으로 하는데, `Reveal` 컴포넌트가 사라졌으므로 대상이 없다. 해당 `<noscript>` 블록을 삭제한다. `<CosmosBackground />`와 `metadata`는 그대로 둔다.

- [ ] **Step 4: 테스트와 빌드 확인**

Run: `npm test && npm run build`
Expected: 남은 테스트 전부 통과, 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore: 스크롤 기반 화면 컴포넌트 제거

성좌 재설계를 위해 섹션·카드·스크롤 연출 컴포넌트를 걷어낸다.
배경 엔진과 데이터 계층은 그대로 유지한다."
```

---

### Task 2: 파라미터 확장과 스크롤 시차 제거

스크롤이 사라졌으므로 스크롤 시차 파라미터는 죽은 값이 된다. 제거하고, 워프·궤도용 파라미터를 추가한다.

**Files:**
- Modify: `src/components/cosmos/params.ts`, `src/components/cosmos/params.test.ts`
- Modify: `src/components/cosmos/field.ts`, `src/components/cosmos/field.test.ts`
- Modify: `src/components/cosmos/renderer.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: `CosmosEnvironment` (기존)
- Produces:
  - `type Phase = 'warp' | 'settle' | 'orbit'`
  - `CosmosParams`에 `warpStarCount, warpSpeed, autoRotate, inertia, skipIntro` 추가, `scrollParallax` 제거
  - `parallaxOffset(depth, mouse, params, viewport): Vec2` — `scrollY` 인자 제거

- [ ] **Step 1: 실패 테스트 작성**

`src/components/cosmos/params.test.ts`의 스크롤 시차 관련 테스트 두 개(`'포인터가 없어도 스크롤 시차는 유지한다'`, 그리고 모션 감소 테스트 안의 `scrollParallax` 단언)를 삭제하고, 아래 테스트를 파일 하단의 `describe('resolveParams', ...)` 안에 추가한다:

```typescript
  it('데스크톱에서는 워프 오프닝과 자동 회전을 사용한다', () => {
    const params = resolveParams(desktop);
    expect(params.skipIntro).toBe(false);
    expect(params.autoRotate).toBeGreaterThan(0);
    expect(params.inertia).toBe(true);
    expect(params.warpStarCount).toBe(420);
  });

  it('포인터가 없으면 워프 별을 줄인다', () => {
    expect(resolveParams(mobile).warpStarCount).toBe(200);
  });

  it('모션 감소 설정에서는 오프닝을 건너뛰고 자동 회전과 관성을 끈다', () => {
    const params = resolveParams(reduced);
    expect(params.skipIntro).toBe(true);
    expect(params.autoRotate).toBe(0);
    expect(params.inertia).toBe(false);
  });

  it('모션 감소 설정에서도 별과 성운은 그린다', () => {
    const params = resolveParams(reduced);
    expect(params.starCount).toBeGreaterThan(0);
    expect(params.nebulaIntensity).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/params.test.ts`
Expected: FAIL — `skipIntro` 등이 `undefined`

- [ ] **Step 3: `params.ts` 수정**

`CosmosParams`에서 `scrollParallax`를 지우고 다섯 항목을 추가한다. `BASE`와 두 분기도 함께 고친다:

```typescript
export type CosmosParams = {
  starCount: number;
  nebulaIntensity: number;
  mouseParallax: number;
  gravity: boolean;
  gravityRadius: number;
  dprCap: number;
  animate: boolean;
  /** 워프 오프닝의 별 개수 */
  warpStarCount: number;
  /** 워프 전진 속도 (z축, 프레임당) */
  warpSpeed: number;
  /** 기본 자동 회전 속도 (라디안/프레임). 0이면 자동 회전 없음 */
  autoRotate: number;
  /** 드래그를 놓았을 때 관성으로 미끄러지는지 */
  inertia: boolean;
  /** 워프 오프닝을 건너뛰고 성좌부터 시작하는지 */
  skipIntro: boolean;
};

const BASE: CosmosParams = {
  starCount: 620,
  nebulaIntensity: 1,
  mouseParallax: 1,
  gravity: true,
  gravityRadius: 170,
  dprCap: 2,
  animate: true,
  warpStarCount: 420,
  warpSpeed: 0.022,
  autoRotate: 0.0022,
  inertia: true,
  skipIntro: false,
};

export function resolveParams(env: CosmosEnvironment): CosmosParams {
  const params = { ...BASE };

  // 호버 포인터가 없으면 마우스 기반 연출이 무의미하고, 모바일 발열·배터리에 직결된다
  if (!env.hasFinePointer) {
    params.starCount = 260;
    params.warpStarCount = 200;
    params.mouseParallax = 0;
    params.gravity = false;
    params.dprCap = 1.5;
  }

  // 워프와 자동 회전은 전정기관 장애가 있는 사용자에게 어지럼증을 유발한다.
  // 사용자가 직접 끄는 드래그는 의도된 움직임이므로 남긴다.
  if (env.prefersReducedMotion) {
    params.animate = false;
    params.skipIntro = true;
    params.autoRotate = 0;
    params.inertia = false;
    params.mouseParallax = 0;
    params.gravity = false;
  }

  return params;
}
```

- [ ] **Step 4: `field.ts`에서 스크롤 인자 제거**

`parallaxOffset`의 시그니처에서 `scrollY`를 빼고 본문에서 스크롤 항을 제거한다. `SCROLL_SCALE` 상수도 삭제한다:

```typescript
export function parallaxOffset(
  depth: number,
  mouse: Vec2,
  params: CosmosParams,
  viewport: Viewport,
): Vec2 {
  const mouseFactor = depth * PARALLAX_SCALE * params.mouseParallax;

  return {
    x: mouse.x * viewport.width * mouseFactor,
    y: mouse.y * viewport.height * mouseFactor,
  };
}
```

`src/components/cosmos/field.test.ts`의 `describe('parallaxOffset', ...)` 블록에서 스크롤 관련 테스트 두 개(`'스크롤은 y축만 밀어낸다'`, `'모션 감소 설정에서는 스크롤에도 반응하지 않는다'`)를 삭제하고, 남은 호출들에서 세 번째 인자 `scrollY`를 뺀다. 예를 들어 `parallaxOffset(0.8, { x: 0, y: 0 }, 0, params, viewport)` → `parallaxOffset(0.8, { x: 0, y: 0 }, params, viewport)`.

- [ ] **Step 5: `renderer.ts`와 `engine.ts` 호출부 수정**

`renderer.ts`의 `drawStars` 안의 호출을 고친다:

```typescript
      const offset = parallaxOffset(layer.depth, state.mouse, params, viewport);
```

`renderer.ts`의 `RenderState`에서 `scrollY` 필드를 제거한다.

`engine.ts`도 함께 고쳐야 빌드가 통과한다. 세 곳이다:

1. `state` 초기화에서 `scrollY: 0,` 줄 삭제
2. `handleScroll` 함수 전체 삭제
3. `window.addEventListener('scroll', handleScroll, { passive: true });`와 `window.removeEventListener('scroll', handleScroll);` 두 줄 삭제

스크롤이 없어진 페이지에서 스크롤 리스너를 유지할 이유가 없다.

- [ ] **Step 6: `Phase` 타입 추가**

`src/types/index.ts` 하단에 추가한다:

```typescript
/** 오프닝 시퀀스의 단계 */
export type Phase = 'warp' | 'settle' | 'orbit';
```

- [ ] **Step 7: 테스트와 빌드 확인**

Run: `npm test && npm run build`
Expected: 전부 통과

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "refactor: 스크롤 시차 제거하고 워프·궤도 파라미터 추가

스크롤을 폐기했으므로 scrollParallax는 죽은 값이 된다.
워프 별 개수, 자동 회전 속도, 관성, 오프닝 건너뛰기를 환경별로 해석한다."
```

---

### Task 3: 페이즈 상태머신 (`phase.ts`)

워프 → 감속 → 성좌 전이를 순수 함수로 만든다. 타이밍이 여기서 코드로 고정된다.

**Files:**
- Create: `src/components/cosmos/phase.ts`
- Test: `src/components/cosmos/phase.test.ts`

**Interfaces:**
- Consumes: `Phase` (Task 2)
- Produces:
  - `type PhaseState = { phase: Phase; elapsed: number; settleT: number }`
  - `function createPhaseState(skipIntro: boolean): PhaseState`
  - `function advancePhase(state: PhaseState): PhaseState`
  - `function requestEnter(state: PhaseState): PhaseState`
  - `function isEnterButtonVisible(state: PhaseState): boolean`
  - 상수 `ENTER_DELAY_FRAMES = 120`, `SETTLE_FRAMES = 96`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/cosmos/phase.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  ENTER_DELAY_FRAMES,
  SETTLE_FRAMES,
  advancePhase,
  createPhaseState,
  isEnterButtonVisible,
  requestEnter,
} from './phase';

/** 상태를 n 프레임 진행시킨다 */
function run(state: ReturnType<typeof createPhaseState>, n: number) {
  let s = state;
  for (let i = 0; i < n; i++) s = advancePhase(s);
  return s;
}

describe('createPhaseState', () => {
  it('기본적으로 워프에서 시작한다', () => {
    const s = createPhaseState(false);
    expect(s.phase).toBe('warp');
    expect(s.settleT).toBe(0);
  });

  it('오프닝을 건너뛰면 성좌에서 시작하고 감속이 이미 끝나 있다', () => {
    const s = createPhaseState(true);
    expect(s.phase).toBe('orbit');
    expect(s.settleT).toBe(1);
  });
});

describe('isEnterButtonVisible', () => {
  it('2초(120프레임) 전에는 보이지 않는다', () => {
    expect(isEnterButtonVisible(run(createPhaseState(false), ENTER_DELAY_FRAMES - 1))).toBe(false);
  });

  it('2초가 지나면 보인다', () => {
    expect(isEnterButtonVisible(run(createPhaseState(false), ENTER_DELAY_FRAMES))).toBe(true);
  });

  it('워프가 아닌 단계에서는 보이지 않는다', () => {
    const entered = requestEnter(run(createPhaseState(false), ENTER_DELAY_FRAMES));
    expect(isEnterButtonVisible(entered)).toBe(false);
  });
});

describe('requestEnter', () => {
  it('워프에서 호출하면 감속으로 넘어간다', () => {
    expect(requestEnter(createPhaseState(false)).phase).toBe('settle');
  });

  it('버튼이 뜨기 전에도 건너뛸 수 있다', () => {
    // 건너뛰기는 워프 내내 눌릴 수 있어야 한다
    expect(requestEnter(createPhaseState(false)).phase).toBe('settle');
  });

  it('이미 성좌면 아무 일도 하지 않는다', () => {
    const orbit = createPhaseState(true);
    expect(requestEnter(orbit)).toEqual(orbit);
  });
});

describe('advancePhase', () => {
  it('워프는 진행해도 단계가 바뀌지 않는다', () => {
    expect(run(createPhaseState(false), 500).phase).toBe('warp');
  });

  it('감속은 진행도가 0에서 1로 오른다', () => {
    const settling = run(requestEnter(createPhaseState(false)), 10);
    expect(settling.settleT).toBeGreaterThan(0);
    expect(settling.settleT).toBeLessThan(1);
  });

  it('감속이 끝나면 성좌가 된다', () => {
    const done = run(requestEnter(createPhaseState(false)), SETTLE_FRAMES + 2);
    expect(done.phase).toBe('orbit');
    expect(done.settleT).toBe(1);
  });

  it('성좌에서는 진행도가 1을 넘지 않는다', () => {
    const done = run(requestEnter(createPhaseState(false)), SETTLE_FRAMES + 200);
    expect(done.settleT).toBe(1);
  });

  it('원래 상태를 변형하지 않는다', () => {
    const s = createPhaseState(false);
    advancePhase(s);
    expect(s.elapsed).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/phase.test.ts`
Expected: FAIL — `Failed to resolve import "./phase"`

- [ ] **Step 3: 구현**

`src/components/cosmos/phase.ts`:

```typescript
import type { Phase } from '@/types';

export type PhaseState = {
  phase: Phase;
  /** 현재 단계에 들어온 뒤 경과한 프레임 */
  elapsed: number;
  /** 감속 진행도 0~1 */
  settleT: number;
};

/** 진입 버튼이 뜨는 시점. 60fps 기준 2.0초 */
export const ENTER_DELAY_FRAMES = 120;
/** 감속에 걸리는 시간. 60fps 기준 1.6초 */
export const SETTLE_FRAMES = 96;

export function createPhaseState(skipIntro: boolean): PhaseState {
  if (skipIntro) return { phase: 'orbit', elapsed: 0, settleT: 1 };
  return { phase: 'warp', elapsed: 0, settleT: 0 };
}

export function isEnterButtonVisible(state: PhaseState): boolean {
  return state.phase === 'warp' && state.elapsed >= ENTER_DELAY_FRAMES;
}

/** 워프에서 감속으로 넘긴다. 진입 버튼과 건너뛰기 모두 이 함수를 쓴다 */
export function requestEnter(state: PhaseState): PhaseState {
  if (state.phase !== 'warp') return state;
  return { phase: 'settle', elapsed: 0, settleT: 0 };
}

export function advancePhase(state: PhaseState): PhaseState {
  if (state.phase === 'warp') {
    return { ...state, elapsed: state.elapsed + 1 };
  }

  if (state.phase === 'settle') {
    const settleT = Math.min(1, state.settleT + 1 / SETTLE_FRAMES);
    if (settleT >= 1) return { phase: 'orbit', elapsed: 0, settleT: 1 };
    return { phase: 'settle', elapsed: state.elapsed + 1, settleT };
  }

  return { ...state, elapsed: state.elapsed + 1, settleT: 1 };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/phase.test.ts`
Expected: 11 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/cosmos/phase.ts src/components/cosmos/phase.test.ts
git commit -m "feat: 워프-감속-성좌 페이즈 상태머신 추가

진입 버튼은 2초 후 뜨지만 건너뛰기는 처음부터 가능하다.
모션 감소 설정이면 성좌 단계에서 바로 시작한다."
```

---

### Task 4: 워프 별 계산 (`warp.ts`)

**Files:**
- Create: `src/components/cosmos/warp.ts`
- Test: `src/components/cosmos/warp.test.ts`

**Interfaces:**
- Consumes: `Viewport` (`field.ts`)
- Produces:
  - `type WarpStar = { x: number; y: number; z: number; pz: number }`
  - `function createWarpStars(count: number, random?: () => number): WarpStar[]`
  - `function advanceWarpStar(star: WarpStar, speed: number, random?: () => number): void` (제자리 변경)
  - `function projectWarpStar(star, viewport): { x, y, px, py, near }`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/cosmos/warp.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { advanceWarpStar, createWarpStars, projectWarpStar } from './warp';

const half = () => 0.5;
const viewport = { width: 1000, height: 800 };

describe('createWarpStars', () => {
  it('요청한 개수를 만든다', () => {
    expect(createWarpStars(420, half)).toHaveLength(420);
  });

  it('z는 0보다 크고 1 이하다', () => {
    for (const s of createWarpStars(200, Math.random)) {
      expect(s.z).toBeGreaterThan(0);
      expect(s.z).toBeLessThanOrEqual(1);
    }
  });

  it('x와 y는 -1에서 1 사이다', () => {
    for (const s of createWarpStars(200, Math.random)) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(s.y)).toBeLessThanOrEqual(1);
    }
  });
});

describe('advanceWarpStar', () => {
  it('z가 줄어든다 — 관측자에게 다가온다', () => {
    const s = { x: 0.5, y: 0.5, z: 0.8, pz: 0.8 };
    advanceWarpStar(s, 0.022, half);
    expect(s.z).toBeLessThan(0.8);
  });

  it('직전 z를 pz에 남긴다 — 잔상 선을 그으려면 필요하다', () => {
    const s = { x: 0.5, y: 0.5, z: 0.8, pz: 0.8 };
    advanceWarpStar(s, 0.022, half);
    expect(s.pz).toBe(0.8);
  });

  it('관측자를 지나치면 먼 곳에서 다시 태어난다', () => {
    const s = { x: 0.5, y: 0.5, z: 0.02, pz: 0.02 };
    advanceWarpStar(s, 0.022, half);
    expect(s.z).toBe(1);
    expect(s.pz).toBe(1);
  });

  it('다시 태어날 때 위치가 새로 뽑힌다', () => {
    // 같은 자리에서 계속 나오면 화면에 줄무늬가 생긴다
    const s = { x: 0.9, y: 0.9, z: 0.01, pz: 0.01 };
    advanceWarpStar(s, 0.022, () => 0.25);
    expect(s.x).toBeCloseTo(-0.5, 5);
    expect(s.y).toBeCloseTo(-0.5, 5);
  });

  it('속도가 0이면 멈춘다 — 감속의 끝에서 필요하다', () => {
    const s = { x: 0.5, y: 0.5, z: 0.8, pz: 0.8 };
    advanceWarpStar(s, 0, half);
    expect(s.z).toBe(0.8);
  });
});

describe('projectWarpStar', () => {
  it('가까울수록 화면 중심에서 멀어진다', () => {
    const far = projectWarpStar({ x: 0.5, y: 0, z: 0.9, pz: 0.9 }, viewport);
    const near = projectWarpStar({ x: 0.5, y: 0, z: 0.2, pz: 0.2 }, viewport);
    expect(Math.abs(near.x - viewport.width / 2)).toBeGreaterThan(
      Math.abs(far.x - viewport.width / 2),
    );
  });

  it('가까울수록 near 값이 크다', () => {
    expect(projectWarpStar({ x: 0.3, y: 0.3, z: 0.1, pz: 0.2 }, viewport).near).toBeGreaterThan(
      projectWarpStar({ x: 0.3, y: 0.3, z: 0.9, pz: 1 }, viewport).near,
    );
  });

  it('항상 유한한 좌표를 낸다', () => {
    const p = projectWarpStar({ x: 1, y: 1, z: 0.001, pz: 0.002 }, viewport);
    for (const v of [p.x, p.y, p.px, p.py]) expect(Number.isFinite(v)).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/warp.test.ts`
Expected: FAIL — `Failed to resolve import "./warp"`

- [ ] **Step 3: 구현**

`src/components/cosmos/warp.ts`:

```typescript
import type { Viewport } from './field';

export type WarpStar = {
  /** -1~1 정규화된 가로 위치 */
  x: number;
  y: number;
  /** 관측자까지의 거리. 1이 가장 멀고 0에 가까울수록 눈앞이다 */
  z: number;
  /** 직전 프레임의 z. 잔상 선의 시작점을 구하는 데 쓴다 */
  pz: number;
};

/** 이보다 가까워지면 관측자를 지나친 것으로 보고 먼 곳에서 다시 태어난다 */
const RECYCLE_Z = 0.015;
/** 투영 배율. 화면 짧은 변에 비례한다 */
const FOV_RATIO = 0.9;

export function createWarpStars(count: number, random: () => number = Math.random): WarpStar[] {
  const stars: WarpStar[] = [];
  for (let i = 0; i < count; i++) {
    const z = random() || 1;
    stars.push({ x: (random() - 0.5) * 2, y: (random() - 0.5) * 2, z, pz: z });
  }
  return stars;
}

export function advanceWarpStar(
  star: WarpStar,
  speed: number,
  random: () => number = Math.random,
): void {
  star.pz = star.z;
  star.z -= speed;

  if (star.z <= RECYCLE_Z) {
    star.z = 1;
    star.pz = 1;
    // 같은 자리에서 다시 나오면 화면에 줄무늬가 생긴다
    star.x = (random() - 0.5) * 2;
    star.y = (random() - 0.5) * 2;
  }
}

export function projectWarpStar(star: WarpStar, viewport: Viewport) {
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  const fov = Math.min(viewport.width, viewport.height) * FOV_RATIO;
  const z = Math.max(star.z, RECYCLE_Z);
  const pz = Math.max(star.pz, RECYCLE_Z);

  return {
    x: cx + (star.x / z) * fov,
    y: cy + (star.y / z) * fov,
    px: cx + (star.x / pz) * fov,
    py: cy + (star.y / pz) * fov,
    near: 1 - z,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/warp.test.ts`
Expected: 12 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/cosmos/warp.ts src/components/cosmos/warp.test.ts
git commit -m "feat: 워프 별 전진과 투영 계산 추가

관측자를 지나친 별은 먼 곳에서 위치를 새로 뽑아 다시 태어난다.
직전 z를 남겨 잔상 선을 그을 수 있게 한다."
```

---

### Task 5: 궤도 슬롯과 좌표 (`orbit.ts` 1/2)

**Files:**
- Create: `src/components/cosmos/orbit.ts`
- Test: `src/components/cosmos/orbit.test.ts`

**Interfaces:**
- Consumes: `Viewport` (`field.ts`)
- Produces:
  - `type OrbitSlot = { id: string; ring: number; baseAngle: number }`
  - `type OrbitPosition = { id: string; x: number; y: number; depth: number; scale: number }`
  - `function assignSlots(projectIds: string[], channelIds: string[]): OrbitSlot[]`
  - `function ringRadii(viewport: Viewport): number[]`
  - `function orbitPositions(slots, rotation, viewport, settleT): OrbitPosition[]`
  - `function frontMostId(positions: OrbitPosition[]): string | null`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/cosmos/orbit.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { assignSlots, frontMostId, orbitPositions, ringRadii } from './orbit';

const viewport = { width: 1200, height: 800 };
const projects = ['todo', 'blog', 'meetup', 'travel'];
const channels = ['github', 'email'];

describe('assignSlots', () => {
  it('모든 항목에 슬롯을 준다', () => {
    expect(assignSlots(projects, channels)).toHaveLength(6);
  });

  it('프로젝트는 안쪽(0번), 채널은 바깥(1번) 궤도에 놓는다', () => {
    const slots = assignSlots(projects, channels);
    for (const id of projects) expect(slots.find((s) => s.id === id)!.ring).toBe(0);
    for (const id of channels) expect(slots.find((s) => s.id === id)!.ring).toBe(1);
  });

  it('같은 궤도 안에서 각도를 균등 분할한다', () => {
    const slots = assignSlots(['a', 'b', 'c', 'd'], []);
    const angles = slots.map((s) => s.baseAngle).sort((x, y) => x - y);
    const gaps = angles.slice(1).map((a, i) => a - angles[i]);
    for (const gap of gaps) expect(gap).toBeCloseTo(Math.PI / 2, 5);
  });

  it('프로젝트가 10개를 넘으면 궤도를 하나 더 쓴다', () => {
    const many = Array.from({ length: 12 }, (_, i) => 'p' + i);
    const rings = new Set(assignSlots(many, []).map((s) => s.ring));
    expect(rings.has(2)).toBe(true);
  });

  it('프로젝트가 10개 이하면 한 궤도만 쓴다', () => {
    const ten = Array.from({ length: 10 }, (_, i) => 'p' + i);
    const rings = new Set(assignSlots(ten, []).map((s) => s.ring));
    expect(rings).toEqual(new Set([0]));
  });

  it('항목이 없어도 예외를 내지 않는다', () => {
    expect(assignSlots([], [])).toEqual([]);
  });
});

describe('ringRadii', () => {
  it('바깥 궤도가 안쪽보다 크다', () => {
    const r = ringRadii(viewport);
    expect(r[1]).toBeGreaterThan(r[0]);
  });

  it('추가 궤도는 안쪽 궤도보다 작다', () => {
    const r = ringRadii(viewport);
    expect(r[2]).toBeLessThan(r[0]);
  });
});

describe('orbitPositions', () => {
  const slots = assignSlots(projects, channels);

  it('슬롯 개수만큼 좌표를 낸다', () => {
    expect(orbitPositions(slots, 0, viewport, 1)).toHaveLength(6);
  });

  it('회전값이 바뀌면 위치도 바뀐다', () => {
    const a = orbitPositions(slots, 0, viewport, 1)[0];
    const b = orbitPositions(slots, 1, viewport, 1)[0];
    expect(a.x).not.toBeCloseTo(b.x, 3);
  });

  it('앞쪽(depth가 큰) 별이 더 크게 그려진다', () => {
    const list = orbitPositions(slots, 0, viewport, 1);
    const front = list.reduce((m, p) => (p.depth > m.depth ? p : m));
    const back = list.reduce((m, p) => (p.depth < m.depth ? p : m));
    expect(front.scale).toBeGreaterThan(back.scale);
  });

  it('depth는 -1과 1 사이다', () => {
    for (const p of orbitPositions(slots, 0.7, viewport, 1)) {
      expect(p.depth).toBeGreaterThanOrEqual(-1);
      expect(p.depth).toBeLessThanOrEqual(1);
    }
  });

  it('감속 중에는 화면 밖 먼 곳에서 시작한다', () => {
    // settleT가 0이면 아직 궤도에 도착하지 않은 상태다
    const far = orbitPositions(slots, 0, viewport, 0)[0];
    const settled = orbitPositions(slots, 0, viewport, 1)[0];
    const cx = viewport.width / 2;
    expect(Math.abs(far.x - cx)).toBeGreaterThan(Math.abs(settled.x - cx));
  });

  it('좌표가 항상 유한하다', () => {
    for (const p of orbitPositions(slots, 3.3, viewport, 0.5)) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});

describe('frontMostId', () => {
  it('depth가 가장 큰 별을 고른다', () => {
    const list = [
      { id: 'a', x: 0, y: 0, depth: -0.5, scale: 1 },
      { id: 'b', x: 0, y: 0, depth: 0.9, scale: 1 },
      { id: 'c', x: 0, y: 0, depth: 0.2, scale: 1 },
    ];
    expect(frontMostId(list)).toBe('b');
  });

  it('비어 있으면 null이다', () => {
    expect(frontMostId([])).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/orbit.test.ts`
Expected: FAIL — `Failed to resolve import "./orbit"`

- [ ] **Step 3: 구현**

`src/components/cosmos/orbit.ts`:

```typescript
import type { Viewport } from './field';

export type OrbitSlot = {
  id: string;
  /** 0 = 안쪽(프로젝트), 1 = 바깥(채널), 2 = 프로젝트가 넘칠 때의 추가 궤도 */
  ring: number;
  baseAngle: number;
};

export type OrbitPosition = {
  id: string;
  x: number;
  y: number;
  /** -1이 가장 뒤, 1이 가장 앞(관측자 쪽) */
  depth: number;
  scale: number;
};

const TAU = Math.PI * 2;
/** 궤도 반경 비율. 인덱스가 곧 ring 번호다 */
const RING_RATIO = [0.3, 0.43, 0.2];
/** 타원의 세로 납작함. 1이면 정원이고 작을수록 눕는다 */
const Y_RATIO = 0.34;
/** 한 궤도가 감당하는 최대 개수. 넘으면 궤도를 하나 더 쓴다 */
const MAX_PER_RING = 10;

function spread(ids: string[], ring: number, offset: number): OrbitSlot[] {
  return ids.map((id, i) => ({
    id,
    ring,
    baseAngle: (i / ids.length) * TAU + offset,
  }));
}

export function assignSlots(projectIds: string[], channelIds: string[]): OrbitSlot[] {
  const slots: OrbitSlot[] = [];

  if (projectIds.length > MAX_PER_RING) {
    // 한 궤도에 몰아넣으면 정면에서 겹친다. 안쪽으로 궤도를 하나 더 판다.
    const half = Math.ceil(projectIds.length / 2);
    slots.push(...spread(projectIds.slice(0, half), 0, 0));
    slots.push(...spread(projectIds.slice(half), 2, 0.4));
  } else if (projectIds.length > 0) {
    slots.push(...spread(projectIds, 0, 0));
  }

  if (channelIds.length > 0) {
    slots.push(...spread(channelIds, 1, 0.6));
  }

  return slots;
}

export function ringRadii(viewport: Viewport): number[] {
  const unit = Math.min(viewport.width, viewport.height * 2.2);
  return RING_RATIO.map((r) => unit * r);
}

export function orbitPositions(
  slots: OrbitSlot[],
  rotation: number,
  viewport: Viewport,
  settleT: number,
): OrbitPosition[] {
  const cx = viewport.width / 2;
  const cy = viewport.height * 0.46;
  const radii = ringRadii(viewport);
  const spreadOut = 1 - settleT;
  const farDistance = Math.max(viewport.width, viewport.height) * 1.1;

  return slots.map((slot, i) => {
    const angle = slot.baseAngle + rotation;
    const radius = radii[slot.ring] ?? radii[0];
    const depth = Math.sin(angle);
    const targetX = cx + Math.cos(angle) * radius;
    const targetY = cy + depth * radius * Y_RATIO;

    // 감속 구간에서는 화면 밖 먼 곳에서 궤도 자리로 빨려 들어온다
    const escapeAngle = (i / Math.max(slots.length, 1)) * TAU;
    const farX = cx + Math.cos(escapeAngle) * farDistance;
    const farY = cy + Math.sin(escapeAngle) * farDistance;

    return {
      id: slot.id,
      x: targetX + (farX - targetX) * spreadOut,
      y: targetY + (farY - targetY) * spreadOut,
      depth,
      scale: 0.62 + 0.38 * ((depth + 1) / 2),
    };
  });
}

export function frontMostId(positions: OrbitPosition[]): string | null {
  if (positions.length === 0) return null;
  return positions.reduce((best, p) => (p.depth > best.depth ? p : best)).id;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/orbit.test.ts`
Expected: 17 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/cosmos/orbit.ts src/components/cosmos/orbit.test.ts
git commit -m "feat: 궤도 슬롯 배치와 좌표 계산 추가

프로젝트가 10개를 넘으면 궤도를 하나 더 파서 정면 겹침을 피한다.
감속 구간에서는 화면 밖에서 궤도 자리로 빨려 들어온다."
```

---

### Task 6: 회전 상태 (`orbit.ts` 2/2)

자동 회전·드래그·관성·정면 정렬을 순수 함수로 만든다.

**Files:**
- Modify: `src/components/cosmos/orbit.ts`, `src/components/cosmos/orbit.test.ts`

**Interfaces:**
- Consumes: `OrbitSlot` (Task 5), `CosmosParams` (Task 2)
- Produces:
  - `type RotationState = { angle: number; velocity: number; target: number | null }`
  - `function createRotation(params: CosmosParams): RotationState`
  - `function advanceRotation(state, params, paused: boolean): RotationState`
  - `function dragRotation(state, deltaX: number, params): RotationState`
  - `function aimAt(state, slot: OrbitSlot): RotationState`
  - `function isSettled(state): boolean`

- [ ] **Step 1: 실패 테스트 추가**

`src/components/cosmos/orbit.test.ts` 하단에 추가하고, 상단 import에 `advanceRotation, aimAt, createRotation, dragRotation, isSettled`를 더한다:

```typescript
import { resolveParams } from './params';

const desktopParams = resolveParams({ hasFinePointer: true, prefersReducedMotion: false });
const reducedParams = resolveParams({ hasFinePointer: true, prefersReducedMotion: true });

describe('advanceRotation', () => {
  it('자동 회전이 켜져 있으면 각도가 늘어난다', () => {
    const next = advanceRotation(createRotation(desktopParams), desktopParams, false);
    expect(next.angle).toBeGreaterThan(0);
  });

  it('모션 감소 설정에서는 저절로 돌지 않는다', () => {
    const next = advanceRotation(createRotation(reducedParams), reducedParams, false);
    expect(next.angle).toBe(0);
  });

  it('패널이 열려 있으면 멈춘다 — 움직이는 글씨는 읽을 수 없다', () => {
    const spun = { angle: 1, velocity: 0.05, target: null };
    expect(advanceRotation(spun, desktopParams, true).angle).toBe(1);
  });

  it('관성이 기본 속도로 수렴한다', () => {
    let s = { angle: 0, velocity: 0.08, target: null };
    for (let i = 0; i < 300; i++) s = advanceRotation(s, desktopParams, false);
    expect(s.velocity).toBeCloseTo(desktopParams.autoRotate, 4);
  });

  it('관성이 꺼져 있으면 놓는 즉시 멈춘다', () => {
    const s = advanceRotation({ angle: 0, velocity: 0.08, target: null }, reducedParams, false);
    expect(s.velocity).toBe(0);
  });
});

describe('dragRotation', () => {
  it('끄는 방향으로 각도가 움직인다', () => {
    const s = dragRotation(createRotation(desktopParams), 40, desktopParams);
    expect(s.angle).toBeGreaterThan(0);
  });

  it('반대로 끌면 반대로 움직인다', () => {
    const s = dragRotation(createRotation(desktopParams), -40, desktopParams);
    expect(s.angle).toBeLessThan(0);
  });

  it('드래그하면 정면 정렬 목표가 취소된다', () => {
    const aiming = { angle: 0, velocity: 0, target: 2 };
    expect(dragRotation(aiming, 10, desktopParams).target).toBeNull();
  });

  it('관성이 꺼져 있어도 드래그는 동작한다', () => {
    expect(dragRotation(createRotation(reducedParams), 40, reducedParams).angle).toBeGreaterThan(0);
  });
});

describe('aimAt', () => {
  const slot = { id: 'todo', ring: 0, baseAngle: 0 };

  it('목표를 설정한다', () => {
    expect(aimAt(createRotation(desktopParams), slot).target).not.toBeNull();
  });

  it('목표에 도달하면 그 별이 정면에 온다', () => {
    let s = aimAt(createRotation(desktopParams), slot);
    for (let i = 0; i < 400; i++) s = advanceRotation(s, desktopParams, true);
    // 정면은 sin이 최대인 지점, 즉 baseAngle + angle === π/2
    expect(Math.sin(slot.baseAngle + s.angle)).toBeCloseTo(1, 2);
  });

  it('한 바퀴 돌지 않고 가까운 쪽으로 돈다', () => {
    // 목표까지의 회전량은 절대 π를 넘지 않아야 한다
    const s = aimAt({ angle: 3, velocity: 0, target: null }, slot);
    expect(Math.abs(s.target! - 3)).toBeLessThanOrEqual(Math.PI + 1e-9);
  });
});

describe('isSettled', () => {
  it('목표가 없으면 안정 상태다', () => {
    expect(isSettled({ angle: 0, velocity: 0, target: null })).toBe(true);
  });

  it('목표가 있으면 아직 아니다', () => {
    expect(isSettled({ angle: 0, velocity: 0, target: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/orbit.test.ts`
Expected: FAIL — `createRotation is not a function`

- [ ] **Step 3: `orbit.ts`에 추가**

```typescript
import type { CosmosParams } from './params';

export type RotationState = {
  angle: number;
  velocity: number;
  /** 정면 정렬 목표 각도. null이면 자유 회전 */
  target: number | null;
};

/** 목표에 다가가는 감쇠 계수 */
const AIM_EASING = 0.09;
/** 목표에 이 정도까지 붙으면 도착으로 본다 */
const AIM_EPSILON = 0.002;
/** 관성이 기본 속도로 되돌아가는 감쇠 계수 */
const INERTIA_DECAY = 0.03;
/** 드래그 1px당 회전량 */
const DRAG_TO_ANGLE = 0.004;
/** 드래그 1px당 남는 관성 */
const DRAG_TO_VELOCITY = 0.0009;
/** 정면으로 보는 각도. 타원의 아래쪽 끝이며 sin이 최대인 지점이다 */
const FRONT_ANGLE = Math.PI / 2;

export function createRotation(params: CosmosParams): RotationState {
  return { angle: 0, velocity: params.autoRotate, target: null };
}

export function advanceRotation(
  state: RotationState,
  params: CosmosParams,
  paused: boolean,
): RotationState {
  if (paused) return state;

  if (state.target !== null) {
    const angle = state.angle + (state.target - state.angle) * AIM_EASING;
    if (Math.abs(state.target - angle) < AIM_EPSILON) {
      return { angle: state.target, velocity: params.autoRotate, target: null };
    }
    return { ...state, angle };
  }

  if (!params.inertia) {
    return { ...state, angle: state.angle + params.autoRotate, velocity: 0 };
  }

  return {
    angle: state.angle + state.velocity,
    velocity: state.velocity + (params.autoRotate - state.velocity) * INERTIA_DECAY,
    target: null,
  };
}

export function dragRotation(
  state: RotationState,
  deltaX: number,
  params: CosmosParams,
): RotationState {
  return {
    angle: state.angle + deltaX * DRAG_TO_ANGLE,
    velocity: params.inertia ? deltaX * DRAG_TO_VELOCITY : 0,
    target: null,
  };
}

/** 지정한 슬롯이 정면에 오도록 목표 각도를 세운다 */
export function aimAt(state: RotationState, slot: OrbitSlot): RotationState {
  const want = FRONT_ANGLE - slot.baseAngle;
  // 한 바퀴 돌지 않고 가까운 쪽으로 돌린다
  const delta = (((want - state.angle + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  return { ...state, target: state.angle + delta, velocity: 0 };
}

export function isSettled(state: RotationState): boolean {
  return state.target === null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/orbit.test.ts`
Expected: 31 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/cosmos/orbit.ts src/components/cosmos/orbit.test.ts
git commit -m "feat: 궤도 회전 상태 추가

드래그·관성·정면 정렬을 순수 함수로 다룬다.
모션 감소 설정에서는 자동 회전과 관성을 끄되 드래그는 남긴다."
```

---

### Task 7: 렌더러 개편

캔버스가 그리는 것을 배경·워프·궤도선으로 바꾼다. 콘텐츠 별은 이제 DOM이므로 캔버스가 그리지 않는다.

**Files:**
- Modify: `src/components/cosmos/renderer.ts`

**Interfaces:**
- Consumes: `WarpStar`/`projectWarpStar` (T4), `ringRadii` (T5), `StarLayer` (`field.ts`), `blobFrame` (`nebula.ts`)
- Produces:
  - `type RenderState = { time: number; mouse: Vec2; cursor: Vec2; pointerActive: boolean; settleT: number }`
  - `createRenderer(ctx).draw(input)` — `input: { layers, warpStars, state, params, viewport, phase }`

- [ ] **Step 1: `RenderState` 교체와 워프·궤도선 드로잉 추가**

`renderer.ts` 상단 import에 다음을 더한다:

```typescript
import { projectWarpStar, type WarpStar } from './warp';
import { ringRadii } from './orbit';
import type { Phase } from '@/types';
```

`RenderState`에서 `scrollY`를 빼고 `settleT`를 넣는다:

```typescript
export type RenderState = {
  time: number;
  mouse: Vec2;
  cursor: Vec2;
  pointerActive: boolean;
  /** 감속 진행도 0~1. 워프와 성좌의 교차 페이드에 쓴다 */
  settleT: number;
};

export type DrawInput = {
  layers: StarLayer[];
  warpStars: WarpStar[];
  state: RenderState;
  params: CosmosParams;
  viewport: Viewport;
  phase: Phase;
};
```

- [ ] **Step 2: 워프와 궤도선 함수 추가**

`drawVignette` 아래에 추가한다:

```typescript
  function drawWarp(warpStars: WarpStar[], viewport: Viewport, alpha: number) {
    if (alpha <= 0.01) return;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#e6ecff';
    for (const star of warpStars) {
      const p = projectWarpStar(star, viewport);
      ctx.globalAlpha = Math.min(1, p.near * 2.2) * alpha;
      ctx.lineWidth = 0.4 + p.near * 1.8;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawOrbitRings(viewport: Viewport, alpha: number) {
    if (alpha <= 0.01) return;
    const cx = viewport.width / 2;
    const cy = viewport.height * 0.46;
    ctx.globalAlpha = alpha * 0.1;
    ctx.strokeStyle = 'rgba(160,180,255,1)';
    ctx.lineWidth = 1;
    for (const radius of ringRadii(viewport)) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius, radius * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
```

- [ ] **Step 3: `draw`를 페이즈에 맞게 교체**

`return { draw: ... }` 블록 전체를 아래로 바꾼다. 기존 `drawVignette` 호출은 제거한다 — 스크롤이 없어져 화면 아래로 올라오는 콘텐츠가 없으므로 비네트가 필요 없다:

```typescript
  return {
    draw({ layers, warpStars, state, params, viewport, phase }: DrawInput) {
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      if (phase === 'warp') {
        drawNebula(state, params, viewport);
        drawWarp(warpStars, viewport, 1);
        return;
      }

      // 감속 구간에서는 워프가 사라지며 성좌가 떠오른다. 컷 없이 이어지게 만드는 지점이다.
      const settled = state.settleT;
      drawNebula(state, params, viewport);
      if (settled < 1) drawWarp(warpStars, viewport, 1 - settled);
      drawStars(layers, state, params, viewport);
      drawOrbitRings(viewport, settled);
    },
  };
```

`drawStars` 안의 별 투명도에 `settled`를 곱해 감속과 함께 떠오르게 한다. `drawStars` 시그니처에 `alpha` 인자를 더한다:

```typescript
  function drawStars(
    layers: StarLayer[],
    state: RenderState,
    params: CosmosParams,
    viewport: Viewport,
    alpha: number,
  ) {
```

본문의 `ctx.globalAlpha = star.alpha * twinkle;`를 `ctx.globalAlpha = star.alpha * twinkle * alpha;`로 바꾸고, 호출부를 `drawStars(layers, state, params, viewport, settled);`로 고친다.

`drawVignette` 함수는 더 이상 호출되지 않으므로 삭제한다.

- [ ] **Step 4: `engine.ts` 호출부를 임시로 맞춘다**

`draw`의 시그니처가 바뀌었으므로 `engine.ts`가 컴파일되지 않는다. 워프와 페이즈는 Task 8에서 제대로 붙이되, **이 태스크만으로도 빌드가 통과해야 하므로** 지금은 최소한으로 맞춘다.

`engine.ts`의 `state` 초기화에 `settleT: 1,`을 추가하고, `frame()` 안의 `renderer.draw(...)` 호출을 아래로 바꾼다:

```typescript
    renderer.draw({
      layers,
      warpStars: [],
      state,
      params,
      viewport,
      phase: 'orbit',
    });
```

`import type { Phase } from '@/types';`는 아직 필요 없다. 문자열 리터럴이 `Phase`로 좁혀지므로 그대로 통과한다.

- [ ] **Step 5: 테스트와 빌드 확인**

Run: `npm test && npm run build`
Expected: 전부 통과. 화면은 아직 배경만 나오지만 깨지지 않는다

- [ ] **Step 6: 커밋**

```bash
git add src/components/cosmos/renderer.ts
git commit -m "refactor: 렌더러를 배경·워프·궤도선 전용으로 개편

콘텐츠 별은 DOM으로 옮겨가므로 캔버스가 그리지 않는다.
감속 구간에서 워프와 성좌가 교차 페이드되어 컷 없이 이어진다."
```

---

### Task 8: 엔진 개편 — 페이즈 루프와 DOM 다리

이 계획에서 가장 어려운 태스크다. 궤도 좌표를 React 상태에 넣지 않고 DOM에 직접 쓰는 다리를 만든다.

**Files:**
- Modify: `src/components/cosmos/engine.ts`
- Test: `src/components/cosmos/engine.test.ts` (전면 교체)

**Interfaces:**
- Consumes: T3~T7의 모든 순수 함수
- Produces:
  - `type StageNode = { id: string; ring: number; baseAngle: number; element: HTMLElement }`
  - `type CosmosCallbacks = { onFront(id: string | null): void; onPhase(phase: Phase): void; onEnterVisible(visible: boolean): void }`
  - `type CosmosHandle = { start; stop; destroy; enter; setNodes; setPaused; drag; aim }`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/cosmos/engine.test.ts` 전체를 교체한다:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCosmos } from './engine';
import { resolveParams } from './params';

function stubCanvas() {
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    canvas: { width: 0, height: 0 },
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    createLinearGradient: vi.fn(() => gradient),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 1200, height: 800, left: 0, top: 0 }),
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

function stubNodes(ids: string[]) {
  return ids.map((id, i) => ({
    id,
    ring: 0,
    baseAngle: (i / ids.length) * Math.PI * 2,
    element: document.createElement('a'),
  }));
}

const desktop = resolveParams({ hasFinePointer: true, prefersReducedMotion: false });
const reduced = resolveParams({ hasFinePointer: true, prefersReducedMotion: true });

function noopCallbacks() {
  return { onFront: vi.fn(), onPhase: vi.fn(), onEnterVisible: vi.fn() };
}

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

describe('createCosmos 생명주기', () => {
  it('start 전에는 그리지 않는다', () => {
    const { canvas, ctx } = stubCanvas();
    createCosmos(canvas, desktop, noopCallbacks());
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('start하면 그린다', () => {
    const { canvas, ctx } = stubCanvas();
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.start();
    expect(ctx.fillRect).toHaveBeenCalled();
    h.destroy();
  });

  it('destroy하면 window 이벤트를 모두 해제한다', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { canvas } = stubCanvas();
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.start();
    h.destroy();
    const removed = spy.mock.calls.map((c) => c[0]);
    for (const name of ['pointermove', 'resize']) expect(removed).toContain(name);
    spy.mockRestore();
  });

  it('destroy를 두 번 호출해도 예외가 없다', () => {
    const { canvas } = stubCanvas();
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.start();
    h.destroy();
    expect(() => h.destroy()).not.toThrow();
  });
});

describe('페이즈 진행', () => {
  it('처음에는 워프 단계를 알린다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, desktop, cb);
    h.start();
    expect(cb.onPhase).toHaveBeenCalledWith('warp');
    h.destroy();
  });

  it('2초가 지나면 진입 버튼을 띄우라고 알린다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, desktop, cb);
    h.start();
    vi.advanceTimersByTime(16 * 130);
    expect(cb.onEnterVisible).toHaveBeenCalledWith(true);
    h.destroy();
  });

  it('enter를 부르면 결국 성좌에 도달한다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, desktop, cb);
    h.start();
    h.enter();
    vi.advanceTimersByTime(16 * 120);
    expect(cb.onPhase).toHaveBeenCalledWith('orbit');
    h.destroy();
  });

  it('모션 감소 설정이면 워프 없이 성좌에서 시작한다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, reduced, cb);
    h.start();
    expect(cb.onPhase).toHaveBeenCalledWith('orbit');
    expect(cb.onPhase).not.toHaveBeenCalledWith('warp');
    h.destroy();
  });
});

describe('DOM 노드 배치', () => {
  it('성좌 단계에서 노드에 transform을 쓴다', () => {
    const { canvas } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, reduced, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    expect(nodes[0].element.style.transform).toContain('translate3d');
    h.destroy();
  });

  it('React 상태를 거치지 않고 정면 별을 알린다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, reduced, cb);
    h.setNodes(stubNodes(['todo', 'blog', 'meetup']));
    h.start();
    expect(cb.onFront).toHaveBeenCalled();
    expect(typeof cb.onFront.mock.calls[0][0]).toBe('string');
    h.destroy();
  });

  it('정면이 바뀌지 않으면 다시 알리지 않는다', () => {
    // 매 프레임 알리면 React가 매 프레임 리렌더된다
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, reduced, cb);
    h.setNodes(stubNodes(['todo']));
    h.start();
    const first = cb.onFront.mock.calls.length;
    vi.advanceTimersByTime(16 * 30);
    expect(cb.onFront.mock.calls.length).toBe(first);
    h.destroy();
  });

  it('노드를 비우면 정면이 null이 된다', () => {
    const { canvas } = stubCanvas();
    const cb = noopCallbacks();
    const h = createCosmos(canvas, reduced, cb);
    h.setNodes(stubNodes(['todo']));
    h.start();
    cb.onFront.mockClear();
    h.setNodes([]);
    expect(cb.onFront).toHaveBeenCalledWith(null);
    h.destroy();
  });
});

describe('회전 조작', () => {
  it('drag는 노드 위치를 바꾼다', () => {
    const { canvas } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, reduced, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    const before = nodes[0].element.style.transform;
    h.drag(120);
    expect(nodes[0].element.style.transform).not.toBe(before);
    h.destroy();
  });

  it('setPaused(true)면 자동 회전이 멈춘다', () => {
    const { canvas } = stubCanvas();
    const nodes = stubNodes(['todo', 'blog']);
    const h = createCosmos(canvas, desktop, noopCallbacks());
    h.setNodes(nodes);
    h.start();
    h.enter();
    vi.advanceTimersByTime(16 * 120);
    h.setPaused(true);
    const frozen = nodes[0].element.style.transform;
    vi.advanceTimersByTime(16 * 60);
    expect(nodes[0].element.style.transform).toBe(frozen);
    h.destroy();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/cosmos/engine.test.ts`
Expected: FAIL — `createCosmos`가 3번째 인자를 받지 않고 `setNodes`가 없다

- [ ] **Step 3: 구현**

`src/components/cosmos/engine.ts` 전체를 교체한다:

```typescript
import type { Phase } from '@/types';
import { createLayers, type StarLayer, type Viewport } from './field';
import {
  advanceRotation,
  aimAt,
  createRotation,
  dragRotation,
  frontMostId,
  orbitPositions,
  type OrbitSlot,
  type RotationState,
} from './orbit';
import type { CosmosParams } from './params';
import {
  advancePhase,
  createPhaseState,
  isEnterButtonVisible,
  requestEnter,
  type PhaseState,
} from './phase';
import { createRenderer, type RenderState } from './renderer';
import { advanceWarpStar, createWarpStars, type WarpStar } from './warp';

export type StageNode = OrbitSlot & { element: HTMLElement };

export type CosmosCallbacks = {
  onFront(id: string | null): void;
  onPhase(phase: Phase): void;
  onEnterVisible(visible: boolean): void;
};

export type CosmosHandle = {
  start(): void;
  stop(): void;
  destroy(): void;
  enter(): void;
  setNodes(nodes: StageNode[]): void;
  setPaused(paused: boolean): void;
  drag(deltaX: number): void;
  aim(id: string): void;
};

/** 마우스 추적 감쇠 계수 */
const EASING = 0.045;
/** 리사이즈 디바운스(ms) */
const RESIZE_DEBOUNCE = 150;

export function createCosmos(
  canvas: HTMLCanvasElement,
  params: CosmosParams,
  callbacks: CosmosCallbacks,
): CosmosHandle {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      start() {}, stop() {}, destroy() {}, enter() {},
      setNodes() {}, setPaused() {}, drag() {}, aim() {},
    };
  }

  const renderer = createRenderer(ctx);
  let viewport: Viewport = { width: 0, height: 0 };
  let layers: StarLayer[] = [];
  let warpStars: WarpStar[] = createWarpStars(params.warpStarCount);
  let nodes: StageNode[] = [];
  let phaseState: PhaseState = createPhaseState(params.skipIntro);
  let rotation: RotationState = createRotation(params);
  let paused = false;
  let frameId: number | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let lastFront: string | null | undefined = undefined;
  let lastPhase: Phase | null = null;
  let lastEnterVisible: boolean | null = null;

  const target = { x: 0, y: 0 };
  const state: RenderState = {
    time: 0,
    mouse: { x: 0, y: 0 },
    cursor: { x: 0, y: 0 },
    pointerActive: false,
    settleT: phaseState.settleT,
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, params.dprCap);
    viewport = { width: rect.width, height: rect.height };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 배경 별의 좌표는 0~1로 정규화되어 있어 리사이즈에도 재생성이 필요 없다
    if (layers.length === 0) layers = createLayers(params.starCount);
  }

  function placeNodes() {
    if (viewport.width === 0) return;
    const positions = orbitPositions(nodes, rotation.angle, viewport, phaseState.settleT);

    for (const p of positions) {
      const node = nodes.find((n) => n.id === p.id);
      if (!node) continue;
      // React 상태를 거치지 않고 DOM에 직접 쓴다. 리렌더가 발생하지 않는다.
      node.element.style.transform =
        `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) scale(${p.scale.toFixed(3)})`;
      node.element.style.opacity = String(phaseState.settleT);
      node.element.style.zIndex = String(Math.round(p.depth * 10) + 20);
    }

    const front = frontMostId(positions);
    // 값이 바뀔 때만 알린다. 매 프레임 알리면 React가 매 프레임 리렌더된다.
    if (front !== lastFront) {
      lastFront = front;
      callbacks.onFront(front);
    }
  }

  function notifyPhase() {
    if (phaseState.phase !== lastPhase) {
      lastPhase = phaseState.phase;
      callbacks.onPhase(phaseState.phase);
    }
    const visible = isEnterButtonVisible(phaseState);
    if (visible !== lastEnterVisible) {
      lastEnterVisible = visible;
      callbacks.onEnterVisible(visible);
    }
  }

  function frame() {
    state.time += 1;
    state.mouse.x += (target.x - state.mouse.x) * EASING;
    state.mouse.y += (target.y - state.mouse.y) * EASING;

    phaseState = advancePhase(phaseState);
    state.settleT = phaseState.settleT;

    if (phaseState.phase !== 'orbit') {
      const speed = phaseState.phase === 'warp'
        ? params.warpSpeed
        : params.warpSpeed * (1 - phaseState.settleT);
      for (const star of warpStars) advanceWarpStar(star, speed);
    }

    if (phaseState.phase === 'orbit') {
      rotation = advanceRotation(rotation, params, paused);
    }

    renderer.draw({ layers, warpStars, state, params, viewport, phase: phaseState.phase });
    placeNodes();
    notifyPhase();

    // 모션 감소 설정에서는 계속 돌리지 않는다. 조작이 있을 때만 다시 그린다.
    const keepGoing = params.animate || phaseState.phase !== 'orbit' || rotation.target !== null;
    frameId = keepGoing && !destroyed ? requestAnimationFrame(frame) : null;
  }

  /** 루프가 멈춰 있으면 한 프레임만 다시 그린다 */
  function requestFrame() {
    if (destroyed || frameId !== null) return;
    frame();
  }

  function handlePointerMove(event: PointerEvent) {
    target.x = event.clientX / window.innerWidth - 0.5;
    target.y = event.clientY / window.innerHeight - 0.5;
    state.cursor.x = event.clientX;
    state.cursor.y = event.clientY;
    state.pointerActive = true;
  }

  function handleResize() {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      resize();
      requestFrame();
    }, RESIZE_DEBOUNCE);
  }

  function handleVisibility() {
    if (document.visibilityState === 'hidden') stop();
    else if (!destroyed) requestFrame();
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

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibility);

  return {
    start,
    stop,
    enter() {
      phaseState = requestEnter(phaseState);
      notifyPhase();
      requestFrame();
    },
    setNodes(next) {
      nodes = next;
      placeNodes();
      requestFrame();
    },
    setPaused(next) {
      paused = next;
      if (!next) requestFrame();
    },
    drag(deltaX) {
      rotation = dragRotation(rotation, deltaX, params);
      placeNodes();
      requestFrame();
    },
    aim(id) {
      const slot = nodes.find((n) => n.id === id);
      if (!slot) return;
      rotation = aimAt(rotation, slot);
      requestFrame();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/cosmos/engine.test.ts`
Expected: 14 passed

- [ ] **Step 5: 전체 테스트와 타입 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 전부 통과. `CosmosBackground.tsx`가 옛 시그니처를 쓰고 있어 타입 오류가 나면 Task 12에서 `Stage`로 대체되므로, 이 시점에는 `CosmosBackground.tsx`와 그 테스트를 삭제한다:

```bash
git rm src/components/cosmos/CosmosBackground.tsx src/components/cosmos/CosmosBackground.test.tsx
```

그리고 `src/app/layout.tsx`에서 해당 import와 `<CosmosBackground />` 사용을 제거한다. 캔버스는 Task 12의 `Stage`가 소유한다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "refactor: 엔진에 페이즈 루프와 DOM 위치 갱신 추가

궤도 좌표를 React 상태가 아니라 DOM의 transform에 직접 쓴다.
정면 별은 값이 바뀔 때만 알려 리렌더를 최소화한다.
모션 감소 설정에서는 루프를 계속 돌리지 않고 조작 시에만 다시 그린다."
```

---

### Task 9: 중심 항성과 궤도 별 (DOM)

**Files:**
- Create: `src/components/stage/CoreStar.tsx`, `src/components/stage/StarLink.tsx`
- Test: `src/components/stage/stars.test.tsx`

**Interfaces:**
- Consumes: `Project` `Channel` `Profile` (`@/types`)
- Produces:
  - `<CoreStar profile={profile} onOpen={() => void} />`
  - `<StarLink id href label accent isFront isProject onOpen ref />` — `forwardRef<HTMLAnchorElement>`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/stage/stars.test.tsx`:

```typescript
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoreStar } from './CoreStar';
import { StarLink } from './StarLink';
import { profile } from '@/data/profile';

afterEach(cleanup);

describe('CoreStar', () => {
  it('이름과 역할을 항상 보여준다', () => {
    render(<CoreStar profile={profile} onOpen={() => {}} />);
    expect(screen.getByText(profile.displayName)).toBeDefined();
    expect(screen.getByText(profile.role)).toBeDefined();
  });

  it('링크가 아니라 버튼이다 — 외부로 나가지 않는다', () => {
    render(<CoreStar profile={profile} onOpen={() => {}} />);
    expect(screen.getByRole('button')).toBeDefined();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('누르면 소개를 연다', () => {
    const onOpen = vi.fn();
    render(<CoreStar profile={profile} onOpen={onOpen} />);
    screen.getByRole('button').click();
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('StarLink', () => {
  const base = {
    id: 'todo',
    href: 'https://todo.cosmoslog.org',
    label: 'todo',
    accent: '129,140,248',
    isProject: true,
    onOpen: () => {},
  };

  it('진짜 링크로 렌더링된다', () => {
    render(<StarLink {...base} isFront={false} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(base.href);
  });

  it('외부 링크에 보안 속성을 함께 붙인다', () => {
    render(<StarLink {...base} isFront={false} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('빈 링크를 만들지 않는다', () => {
    render(<StarLink {...base} isFront={false} />);
    const href = screen.getByRole('link').getAttribute('href') ?? '';
    expect(href).not.toBe('#');
    expect(href.trim().length).toBeGreaterThan(0);
  });

  it('터치 타깃을 44px 이상 확보한다', () => {
    render(<StarLink {...base} isFront={false} />);
    // 시각적 점은 작아도 실제로 누를 수 있는 영역은 넓어야 한다
    expect(screen.getByRole('link').className).toContain('min-h-[44px]');
    expect(screen.getByRole('link').className).toContain('min-w-[44px]');
  });

  it('정면에 오면 이름이 보인다', () => {
    render(<StarLink {...base} isFront />);
    expect(screen.getByText('todo')).toBeDefined();
  });

  it('정면이 아니어도 이름은 DOM에 남는다', () => {
    // 스크린 리더와 검색엔진이 읽어야 하므로 지우지 않고 시각적으로만 숨긴다
    render(<StarLink {...base} isFront={false} />);
    expect(screen.getByText('todo')).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/stage/stars.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: `CoreStar` 구현**

`src/components/stage/CoreStar.tsx`:

```tsx
'use client';

import type { Profile } from '@/types';

type Props = {
  profile: Profile;
  onOpen: () => void;
};

export function CoreStar({ profile, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="absolute left-1/2 top-[46%] z-30 flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full px-6 py-4 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 rounded-full bg-[#fff8e6] shadow-[0_0_28px_12px_rgba(255,214,140,0.35)]"
      />
      <span className="mt-2 text-base font-semibold text-[#fffaeb]">{profile.displayName}</span>
      <span className="text-xs text-[color:var(--cosmos-muted)]">{profile.role}</span>
    </button>
  );
}
```

- [ ] **Step 4: `StarLink` 구현**

`src/components/stage/StarLink.tsx`:

```tsx
'use client';

import { forwardRef } from 'react';

type Props = {
  id: string;
  href: string;
  label: string;
  accent: string;
  isProject: boolean;
  isFront: boolean;
  onOpen: (id: string) => void;
};

export const StarLink = forwardRef<HTMLAnchorElement, Props>(function StarLink(
  { id, href, label, accent, isProject, isFront, onOpen },
  ref,
) {
  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-star={id}
      onClick={(event) => {
        // 첫 클릭은 패널을 여는 데 쓴다. 링크로 나가는 것은 패널 안의 버튼이 맡는다.
        event.preventDefault();
        onOpen(id);
      }}
      className="group absolute left-0 top-0 flex min-h-[44px] min-w-[44px] items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
    >
      <span
        aria-hidden="true"
        className="rounded-full transition-transform group-hover:scale-150"
        style={{
          width: isProject ? 11 : 7,
          height: isProject ? 11 : 7,
          backgroundColor: `rgb(${accent})`,
          boxShadow: `0 0 18px 6px rgba(${accent},0.35)`,
        }}
      />
      <span
        className={`pointer-events-none absolute top-full mt-1 whitespace-nowrap text-xs font-semibold text-[#eef2ff] transition-opacity ${
          isFront ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
        }`}
      >
        {label}
      </span>
    </a>
  );
});
```

`opacity-0`은 시각적으로만 숨기고 DOM에서는 지우지 않는다. 스크린 리더와 검색엔진이 읽어야 하기 때문이다.

**`onFocus` 핸들러를 달지 않는 것이 의도된 설계다.** 포커스가 이동할 때마다 궤도를 돌리면 Tab을 누를 때마다 화면 전체가 회전해서 방향 감각을 잃는다. 포커스는 라벨과 포커스 링만 보여주고, 회전은 명시적인 클릭(`onOpen`)에서만 일어난다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test src/components/stage/stars.test.tsx`
Expected: 10 passed

- [ ] **Step 6: 커밋**

```bash
git add src/components/stage
git commit -m "feat: 중심 항성과 궤도 별을 DOM 요소로 추가

캔버스가 아니라 진짜 링크·버튼이라 키보드와 스크린 리더가 인식한다.
정면이 아닌 별의 이름은 시각적으로만 숨기고 DOM에는 남긴다."
```

---

### Task 10: 패널

**Files:**
- Create: `src/components/stage/StarPanel.tsx`
- Test: `src/components/stage/panel.test.tsx`

**Interfaces:**
- Consumes: `Project` `Channel` (`@/types`)
- Produces: `<StarPanel content={PanelContent | null} onClose={() => void} />`
  - `type PanelContent = { title: string; body: string[]; tech?: string[]; status?: ProjectStatus; href?: string; hrefLabel?: string }`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/stage/panel.test.tsx`:

```typescript
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StarPanel } from './StarPanel';

afterEach(cleanup);

const project = {
  title: 'todo',
  body: ['할 일을 기록하고 관리하는 앱'],
  tech: ['Next.js', 'TypeScript'],
  status: 'building' as const,
  href: 'https://todo.cosmoslog.org',
  hrefLabel: '사이트 열기',
};

describe('StarPanel', () => {
  it('내용이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<StarPanel content={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('제목과 본문을 보여준다', () => {
    render(<StarPanel content={project} onClose={() => {}} />);
    expect(screen.getByText('todo')).toBeDefined();
    expect(screen.getByText('할 일을 기록하고 관리하는 앱')).toBeDefined();
  });

  it('개발 중인 항목에 배지를 보여준다', () => {
    render(<StarPanel content={project} onClose={() => {}} />);
    expect(screen.getByText('개발 중')).toBeDefined();
  });

  it('운영 중인 항목에는 배지가 없다', () => {
    render(<StarPanel content={{ ...project, status: 'live' }} onClose={() => {}} />);
    expect(screen.queryByText('개발 중')).toBeNull();
  });

  it('바로가기 링크에 보안 속성을 붙인다', () => {
    render(<StarPanel content={project} onClose={() => {}} />);
    const link = screen.getByRole('link', { name: /사이트 열기/ });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('링크가 없는 내용은 링크를 그리지 않는다', () => {
    render(<StarPanel content={{ title: '나', body: ['소개'] }} onClose={() => {}} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('닫기 버튼이 있다', () => {
    const onClose = vi.fn();
    render(<StarPanel content={project} onClose={onClose} />);
    screen.getByRole('button', { name: '닫기' }).click();
    expect(onClose).toHaveBeenCalled();
  });

  it('Esc 키로 닫힌다', () => {
    const onClose = vi.fn();
    render(<StarPanel content={project} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('대화상자로 알린다', () => {
    render(<StarPanel content={project} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/stage/panel.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`src/components/stage/StarPanel.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import type { ProjectStatus } from '@/types';

export type PanelContent = {
  title: string;
  body: string[];
  tech?: string[];
  status?: ProjectStatus;
  href?: string;
  hrefLabel?: string;
};

type Props = {
  content: PanelContent | null;
  onClose: () => void;
};

export function StarPanel({ content, onClose }: Props) {
  useEffect(() => {
    if (!content) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [content, onClose]);

  if (!content) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={content.title}
      className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-white/12 bg-[rgba(8,10,22,0.9)] p-6 backdrop-blur-md sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[22rem] sm:-translate-x-1/2 sm:-translate-y-1/2"
    >
      <div className="mb-2 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-[#f2f5ff]">{content.title}</h2>
        {content.status === 'building' && (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[11px] text-amber-200">
            개발 중
          </span>
        )}
      </div>

      {content.body.map((line) => (
        <p key={line} className="mb-2 text-sm leading-relaxed text-[color:var(--cosmos-muted)]">
          {line}
        </p>
      ))}

      {content.tech && content.tech.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {content.tech.map((item) => (
            <li
              key={item}
              className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-[color:var(--cosmos-muted)]"
            >
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center justify-between gap-4">
        {content.href ? (
          <a
            href={content.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#c7d2fe] underline underline-offset-4 hover:text-white"
          >
            {content.hrefLabel ?? '바로가기'} →
          </a>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] rounded-full border border-white/15 px-4 text-sm text-[color:var(--cosmos-muted)] hover:text-white"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/stage/panel.test.tsx`
Expected: 9 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/stage/StarPanel.tsx src/components/stage/panel.test.tsx
git commit -m "feat: 별 패널 추가

데스크톱은 가운데 카드, 모바일은 하단 시트로 배치한다.
닫기 버튼과 Esc 키 둘 다 지원한다."
```

---

### Task 11: 진입과 건너뛰기

**Files:**
- Create: `src/components/stage/IntroControls.tsx`
- Test: `src/components/stage/intro.test.tsx`

**Interfaces:**
- Consumes: `Phase` (`@/types`)
- Produces: `<IntroControls phase enterVisible onEnter />`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/stage/intro.test.tsx`:

```typescript
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntroControls } from './IntroControls';

afterEach(cleanup);

describe('IntroControls', () => {
  it('워프 중에는 건너뛰기가 처음부터 있다', () => {
    // 강제 대기는 이탈로 이어진다. 버튼이 뜨기 전에도 빠져나갈 수 있어야 한다.
    render(<IntroControls phase="warp" enterVisible={false} onEnter={() => {}} />);
    expect(screen.getByRole('button', { name: '건너뛰기' })).toBeDefined();
  });

  it('2초 전에는 진입 버튼이 없다', () => {
    render(<IntroControls phase="warp" enterVisible={false} onEnter={() => {}} />);
    expect(screen.queryByRole('button', { name: '진입' })).toBeNull();
  });

  it('2초가 지나면 진입 버튼이 나온다', () => {
    render(<IntroControls phase="warp" enterVisible onEnter={() => {}} />);
    expect(screen.getByRole('button', { name: '진입' })).toBeDefined();
  });

  it('진입을 누르면 알린다', () => {
    const onEnter = vi.fn();
    render(<IntroControls phase="warp" enterVisible onEnter={onEnter} />);
    screen.getByRole('button', { name: '진입' }).click();
    expect(onEnter).toHaveBeenCalled();
  });

  it('건너뛰기도 같은 동작을 한다', () => {
    const onEnter = vi.fn();
    render(<IntroControls phase="warp" enterVisible={false} onEnter={onEnter} />);
    screen.getByRole('button', { name: '건너뛰기' }).click();
    expect(onEnter).toHaveBeenCalled();
  });

  it('성좌에 도착하면 아무 버튼도 남지 않는다', () => {
    render(<IntroControls phase="orbit" enterVisible={false} onEnter={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('감속 중에도 버튼이 사라진다', () => {
    render(<IntroControls phase="settle" enterVisible onEnter={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('도메인을 표시한다', () => {
    render(<IntroControls phase="warp" enterVisible={false} onEnter={() => {}} />);
    expect(screen.getByText('me.cosmoslog.org')).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/stage/intro.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`src/components/stage/IntroControls.tsx`:

```tsx
'use client';

import type { Phase } from '@/types';

type Props = {
  phase: Phase;
  enterVisible: boolean;
  onEnter: () => void;
};

export function IntroControls({ phase, enterVisible, onEnter }: Props) {
  if (phase !== 'warp') return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center">
      <p className="absolute top-8 text-[0.7rem] uppercase tracking-[0.42em] text-[color:var(--cosmos-muted)]">
        me.cosmoslog.org
      </p>

      {enterVisible && (
        <button
          type="button"
          onClick={onEnter}
          className="pointer-events-auto min-h-[44px] rounded-full border border-white/35 bg-white/10 px-8 py-3 text-sm tracking-widest text-[#eef2ff] backdrop-blur-sm transition hover:bg-white/20"
        >
          진입
        </button>
      )}

      <button
        type="button"
        onClick={onEnter}
        className="pointer-events-auto absolute bottom-6 right-6 min-h-[44px] px-3 text-xs text-[color:var(--cosmos-muted)] underline underline-offset-4 hover:text-white"
      >
        건너뛰기
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/components/stage/intro.test.tsx`
Expected: 8 passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/stage/IntroControls.tsx src/components/stage/intro.test.tsx
git commit -m "feat: 진입·건너뛰기 버튼 추가

진입 버튼은 2초 후 뜨지만 건너뛰기는 워프 내내 눌릴 수 있다."
```

---

### Task 12: 무대 조립

모든 조각을 연결한다.

**Files:**
- Create: `src/components/stage/Stage.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`
- Test: `src/components/stage/stage.test.tsx`

**Interfaces:**
- Consumes: T8~T11 전부, `projects` `channels` `profile` (`@/data`)
- Produces: `<Stage />` — `page.tsx`가 사용

- [ ] **Step 1: 실패 테스트 작성**

`src/components/stage/stage.test.tsx`:

```typescript
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Stage } from './Stage';
import { projects } from '@/data/projects';
import { channels } from '@/data/channels';

afterEach(cleanup);

describe('Stage', () => {
  it('모든 프로젝트와 채널을 링크로 렌더링한다', () => {
    render(<Stage />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(projects.length + channels.length);
  });

  it('모든 링크가 유효한 주소를 가진다', () => {
    render(<Stage />);
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toBe('#');
      expect(href.trim().length).toBeGreaterThan(0);
    }
  });

  it('캔버스를 보조 기술에서 숨긴다', () => {
    const { container } = render(<Stage />);
    const canvas = container.querySelector('canvas');
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    expect(canvas?.className).toContain('pointer-events-none');
  });

  it('중심 항성이 키보드 순서에서 첫 번째다', () => {
    // 처음 Tab을 눌렀을 때 닿는 것이 "이 사람이 누구인가"여야 한다
    const { container } = render(<Stage />);
    const focusable = container.querySelectorAll('a[href], button');
    expect(focusable[0].textContent).toContain('오드');
  });

  it('언마운트되어도 예외가 없다', () => {
    const { unmount } = render(<Stage />);
    expect(() => unmount()).not.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/components/stage/stage.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`src/components/stage/Stage.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createCosmos, type CosmosHandle, type StageNode } from '@/components/cosmos/engine';
import { readEnvironment } from '@/components/cosmos/environment';
import { assignSlots } from '@/components/cosmos/orbit';
import { resolveParams } from '@/components/cosmos/params';
import { channels } from '@/data/channels';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import type { Phase } from '@/types';
import { CoreStar } from './CoreStar';
import { IntroControls } from './IntroControls';
import { StarLink } from './StarLink';
import { StarPanel, type PanelContent } from './StarPanel';

const CHANNEL_ACCENT = '203,213,225';
const PROJECT_ACCENTS = ['129,140,248', '167,139,250', '56,189,248', '244,114,182'];
/** 가장자리 스와이프는 브라우저 뒤로가기와 충돌하므로 회전 입력에서 제외한다 */
const EDGE_EXCLUSION = 24;

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<CosmosHandle | null>(null);
  const starRefs = useRef(new Map<string, HTMLAnchorElement>());
  const dragX = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>('warp');
  const [enterVisible, setEnterVisible] = useState(false);
  const [front, setFront] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelContent | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const params = resolveParams(readEnvironment());
    const handle = createCosmos(canvas, params, {
      onFront: setFront,
      onPhase: setPhase,
      onEnterVisible: setEnterVisible,
    });
    handleRef.current = handle;

    const slots = assignSlots(
      projects.map((p) => p.slug),
      channels.map((c) => c.kind),
    );
    const nodes: StageNode[] = slots.flatMap((slot) => {
      const element = starRefs.current.get(slot.id);
      return element ? [{ ...slot, element }] : [];
    });
    handle.setNodes(nodes);
    handle.start();

    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, []);

  // 패널이 열려 있는 동안 회전을 멈춘다
  useEffect(() => {
    handleRef.current?.setPaused(panel !== null);
  }, [panel]);

  const openProject = useCallback((slug: string) => {
    const project = projects.find((p) => p.slug === slug);
    if (!project) return;
    handleRef.current?.aim(slug);
    setPanel({
      title: project.name,
      body: [project.tagline],
      tech: project.tech,
      status: project.status,
      href: project.url,
      hrefLabel: '사이트 열기',
    });
  }, []);

  const openChannel = useCallback((kind: string) => {
    const channel = channels.find((c) => c.kind === kind);
    if (!channel) return;
    handleRef.current?.aim(kind);
    setPanel({ title: channel.label, body: [], href: channel.href, hrefLabel: '바로가기' });
  }, []);

  const openProfile = useCallback(() => {
    setPanel({ title: profile.displayName, body: profile.intro });
  }, []);

  function onPointerDown(event: React.PointerEvent) {
    if (phase !== 'orbit') return;
    const { clientX } = event;
    if (clientX < EDGE_EXCLUSION || clientX > window.innerWidth - EDGE_EXCLUSION) return;
    dragX.current = clientX;
  }

  function onPointerMove(event: React.PointerEvent) {
    if (dragX.current === null) return;
    handleRef.current?.drag(event.clientX - dragX.current);
    dragX.current = event.clientX;
  }

  function endDrag() {
    dragX.current = null;
  }

  return (
    <main
      className="relative h-screen w-screen overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <CoreStar profile={profile} onOpen={openProfile} />

      {projects.map((project, i) => (
        <StarLink
          key={project.slug}
          id={project.slug}
          href={project.url}
          label={project.name}
          accent={project.accent ?? PROJECT_ACCENTS[i % PROJECT_ACCENTS.length]}
          isProject
          isFront={front === project.slug}
          onOpen={openProject}
          ref={(el) => {
            if (el) starRefs.current.set(project.slug, el);
          }}
        />
      ))}

      {channels.map((channel) => (
        <StarLink
          key={channel.kind}
          id={channel.kind}
          href={channel.href}
          label={channel.label}
          accent={CHANNEL_ACCENT}
          isProject={false}
          isFront={front === channel.kind}
          onOpen={openChannel}
          ref={(el) => {
            if (el) starRefs.current.set(channel.kind, el);
          }}
        />
      ))}

      <IntroControls
        phase={phase}
        enterVisible={enterVisible}
        onEnter={() => handleRef.current?.enter()}
      />

      <StarPanel content={panel} onClose={() => setPanel(null)} />
    </main>
  );
}
```

- [ ] **Step 4: 페이지와 레이아웃 연결**

`src/app/page.tsx`:

```tsx
import { Stage } from '@/components/stage/Stage';

export default function Home() {
  return <Stage />;
}
```

`src/app/globals.css`의 `html`에서 `scroll-behavior: smooth;`를 제거하고 `body`에 `overflow: hidden;`을 더한다. 스크롤이 없어졌으므로 스크롤바가 뜨면 안 된다:

```css
body {
  background-color: transparent;
  color: var(--cosmos-text);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
```

`@media (prefers-reduced-motion: reduce)` 블록 안의 `scroll-behavior` 규칙도 삭제한다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test src/components/stage/stage.test.tsx`
Expected: 5 passed

- [ ] **Step 6: 실제 화면 확인**

Run: `npm run dev`

확인할 것: 워프가 도는가 · 2초 후 진입 버튼이 뜨는가 · 건너뛰기가 처음부터 있는가 · 진입을 누르면 컷 없이 성좌가 되는가 · 좌우로 끌면 도는가 · 별을 누르면 정면으로 오면서 패널이 열리는가 · Esc로 닫히는가 · Tab으로 별을 순회하는가

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 성좌 무대 조립

캔버스·DOM 별·패널·오프닝 컨트롤을 하나로 연결한다.
회전 입력은 가장자리 24px을 제외해 브라우저 뒤로가기와 충돌하지 않는다."
```

---

### Task 13: 접근성 회귀와 마무리

**Files:**
- Create: `src/app/accessibility.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: 완성된 `Stage`
- Produces: 없음 (회귀 방지 테스트)

- [ ] **Step 1: 실패 테스트 작성**

`src/app/accessibility.test.tsx`:

```typescript
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Home from './page';
import { channels } from '@/data/channels';
import { projects } from '@/data/projects';

afterEach(cleanup);

describe('페이지 접근성', () => {
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

  it('모든 외부 링크가 보안 속성을 함께 갖는다', () => {
    render(<Home />);
    for (const link of screen.getAllByRole('link')) {
      if (link.getAttribute('target') !== '_blank') continue;
      const rel = link.getAttribute('rel') ?? '';
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });

  it('JS가 실행되기 전에도 모든 목적지가 HTML에 존재한다', () => {
    // 캔버스에 그린 그림이었다면 이 테스트는 통과할 수 없다
    render(<Home />);
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    for (const project of projects) expect(hrefs).toContain(project.url);
    for (const channel of channels) expect(hrefs).toContain(channel.href);
  });

  it('키보드로 도달 가능한 요소가 링크 수보다 많다', () => {
    // 중심 항성 버튼과 건너뛰기 버튼이 더 있어야 한다
    const { container } = render(<Home />);
    const focusable = container.querySelectorAll('a[href], button');
    expect(focusable.length).toBeGreaterThan(projects.length + channels.length);
  });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `npm test src/app/accessibility.test.tsx`
Expected: 5 passed. 실패하면 테스트를 완화하지 말고 해당 컴포넌트를 고친다

- [ ] **Step 3: 레이아웃 메타데이터 확인**

`src/app/layout.tsx`에서 `<CosmosBackground />` import와 사용이 Task 8에서 제거되었는지 확인한다. `metadata`와 `<html lang="ko">`는 그대로 둔다. `<body>`에 `{children}`만 남아야 한다.

- [ ] **Step 4: 전체 검증**

```bash
npm test
npm run build
npx serve out
```

브라우저에서 확인할 것:

1. 워프가 돌고 2초 후 진입 버튼이 뜬다
2. 건너뛰기가 처음부터 눌린다
3. 진입 → 감속 → 성좌가 컷 없이 이어진다
4. 좌우 드래그로 돌고 놓으면 관성으로 미끄러진다
5. 정면에 온 별의 이름이 보인다
6. 별을 누르면 정면으로 오면서 패널이 열리고, 열린 동안 회전이 멈춘다
7. Esc로 패널이 닫힌다
8. Tab만으로 중심 항성 → 별들을 순회하고 Enter로 열린다. **Tab을 눌러도 궤도가 저절로 돌지 않는다**
9. 스크롤바가 생기지 않는다
10. 개발자도구의 대비 검사기로 패널 본문과 정면 라벨의 대비가 **4.5:1 이상**인지 확인한다 (배경이 어두워 대부분 통과하지만, 성운이 밝은 지점 위에 패널이 놓일 때가 관건이다)

macOS **시스템 설정 → 손쉬운 사용 → 디스플레이 → 동작 줄이기**를 켜고 새로고침:

10. 워프 없이 성좌부터 시작한다
11. 저절로 돌지 않지만 드래그로는 돌아간다

개발자도구 모바일 에뮬레이션으로 전환:

12. 스와이프로 회전하고 탭으로 패널이 열린다
13. 패널이 하단 시트로 뜬다

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 성좌 페이지 접근성 회귀 테스트 추가

별이 DOM이므로 모든 목적지가 HTML에 존재한다는 것을 테스트로 고정한다.
캔버스에 그린 그림이었다면 통과할 수 없는 테스트다."
```

---

## 남은 콘텐츠 작업

구현이 끝나도 아래는 플레이스홀더 상태다. 데이터 파일만 고치면 되며 코드 변경은 필요 없다.

| 파일 | 항목 |
|---|---|
| `src/data/projects.ts` | blog·meetup·travel의 실제 Vercel URL (현재 셋 다 `https://vercel.com`) |
| `src/data/channels.ts` | 인스타그램 핸들, 블로그 주소 — 추가하면 바깥 궤도에 별이 늘어난다 |
| `src/components/cosmos/nebula.ts` | 브랜드 컬러 확정 시 blob 색상 |
| `src/app/favicon.ico` | 현재 create-next-app 기본값 |
