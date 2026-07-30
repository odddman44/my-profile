# cosmoslog 프로필 사이트 설계

작성일: 2026-07-28
상태: 설계 승인 완료 · 문서 리뷰 대기

## 1. 목적과 성격

`me.cosmoslog.org`에 놓일 **개인 아이덴티티 허브**다. 채용 지원용 이력서가 아니라 "이 사람은 누구이고 무엇을 만들었나"를 보여주는 개인 브랜딩 사이트다.

`cosmoslog.org` 루트는 추후 만들 통합 글쓰기 플랫폼의 자리이므로 이 사이트가 차지하지 않는다. 이 사이트는 다른 앱으로 가는 관문(게이트웨이)이 아니라 **사람을 소개하는 독립된 페이지**다. 프로젝트 링크는 "이 사람이 무엇을 만들었나"를 보여주기 위한 것이지 서비스 진입 동선이 아니다.

방문자가 사이트를 떠날 때 가져가야 할 것은 두 가지다.

1. 이 사람이 만든 것들의 목록과 각각으로 가는 링크
2. 인상 — 우주 공간에 들어왔다 나간 느낌

### 우주 테마의 해석

우주는 **콘텐츠를 담는 구조가 아니라 사이트가 존재하는 공간**이다. 배포한 앱 4개를 행성에 1:1 매핑하는 식의 도식은 쓰지 않는다. 그런 매핑은 앱이 5개, 10개로 늘어날 때마다 레이아웃을 다시 짜야 하고, 무엇보다 억지스럽다.

장엄함은 정돈된 배치가 아니라 **무수함과 스케일**에서 온다. 따라서 우주는 상시 배경으로 존재하고, 콘텐츠는 그 공간 안에 자연스럽게 놓인다.

## 2. 확정된 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 주소 | `me.cosmoslog.org` | 브랜드 일관성 유지, 루트는 플랫폼 몫으로 비워둠 |
| 비주얼 | 성운 + 시차 별필드 + 국지적 중력 렌즈 | 라이브 시안 4종 비교 후 선택 |
| 페이지 구조 | 고정 배경 연속 스크롤, 히어로만 풀스크린 | 스크롤 중에도 공간감 유지 |
| 스택 | Next.js 16 + TypeScript + Tailwind CSS | 학습 목표 스택이자 향후 cosmoslog 플랫폼과 동일 기반 |
| 배포 | static export → GitHub Pages | 정적 사이트에 서버가 불필요 |
| 콘텐츠 관리 | TypeScript 데이터 파일 | 관리 UI/DB는 이 규모에서 과잉 |
| 테마 | 다크 고정 | 우주에 라이트 모드는 형용모순 |

### 기술 스택 섹션 제거

기존 사이트의 "기술 스택" 섹션(Java·Spring Boot·데이터베이스 아이콘 나열)은 삭제한다. 아이콘 나열은 구직용 이력서의 문법이고 아이덴티티 허브에서는 정보 가치가 낮다. 기술은 각 프로젝트 카드의 태그로 녹인다. 실제로 무엇에 썼는지가 함께 보이므로 정보량이 오히려 늘어난다.

## 3. 페이지 구조

```
[히어로 — 100vh]
   kicker: me.cosmoslog.org
   대형 카피
   한 줄 소개

[나]        — 짧은 자기소개
[만든 것들]  — 프로젝트 카드 그리드 (핵심 섹션)
[기록]      — 블로그 등 글 채널로의 링크
[채널]      — 인스타그램 / GitHub / 이메일
[푸터]
```

배경 캔버스는 `position: fixed`로 전 구간에 깔린다. 콘텐츠만 그 위를 지나간다.

## 4. 아키텍처

```
src/
  app/
    layout.tsx              메타데이터, 폰트, OG 태그
    page.tsx                섹션 조립 (서버 컴포넌트)
    globals.css
  components/
    cosmos/
      CosmosBackground.tsx  fixed 캔버스 마운트 (클라이언트 컴포넌트)
      engine.ts             렌더 루프 — React를 import하지 않는 순수 TS
      params.ts             성운/별/중력 파라미터 상수
    sections/
      Hero.tsx  About.tsx  Projects.tsx  Writing.tsx  Channels.tsx
    ui/
      GlassPanel.tsx  ProjectCard.tsx
  data/
    profile.ts  projects.ts  channels.ts
  types/
    index.ts
```

### 핵심 설계 원칙: 캔버스 엔진은 React 상태를 쓰지 않는다

마우스 좌표를 `useState`에 담으면 초당 60회 리렌더가 발생해 사이트가 멈춘다. 좌표와 스크롤 오프셋은 `ref`에만 담고 `requestAnimationFrame` 루프가 직접 읽는다. **React 리렌더는 0회**다.

`engine.ts`는 React에 의존하지 않는 순수 TypeScript 모듈로 분리한다. 캔버스 컨텍스트와 설정 객체를 받아 `start()` / `stop()` 핸들을 반환한다. React 없이 단독 테스트가 가능하고, 컴포넌트는 마운트/언마운트만 책임진다.

```typescript
type CosmosHandle = { start(): void; stop(): void; resize(): void };
function createCosmos(canvas: HTMLCanvasElement, params: CosmosParams): CosmosHandle;
```

## 5. 배경 엔진 사양

캔버스 하나에 매 프레임 3단으로 합성한다.

### 레이어 1 — 성운

- radial gradient blob 4개, 가산 합성(`globalCompositeOperation = 'lighter'`)
- 각 blob은 서로 다른 주기로 아주 느리게 위치·크기 변화
- 매 프레임 그라디언트를 새로 생성하지 않고 오프스크린 캔버스에 캐싱한다

### 레이어 2 — 시차 별필드

깊이 3단계, 총 620개(데스크톱 기준).

| 레이어 | 비율 | depth | 크기 | 투명도 |
|---|---|---|---|---|
| 원거리 | 60% | 0.10 | 0.4–0.9 | 0.20–0.45 |
| 중거리 | 28% | 0.34 | 0.7–1.4 | 0.40–0.75 |
| 근거리 | 12% | 0.78 | 1.1–2.2 | 0.70–1.00 |

- 마우스 오프셋 × depth 만큼 x/y 이동 (lerp 계수 0.045로 감쇠)
- 스크롤 오프셋 × depth 만큼 y축 추가 이동
- 별마다 고유 주기의 반짝임
- 마우스와 무관한 아주 느린 자체 드리프트 — **마우스를 떼도 화면이 죽지 않아야 한다**

### 레이어 3 — 국지적 중력 렌즈

- 커서 반경 **170px** 안, **근거리 레이어에만** 적용
- 거리에 반비례해 커서 쪽으로 끌리며, 궤도 접선 성분을 더해 휘어지는 궤적을 만든다
- 가까울수록 별이 길게 늘어난다(최대 3.4배), 늘어나는 축은 커서 방향에 수직
- 커서 주변에 은은한 가산 광원

전역에 걸지 않는 이유: 전체에 적용하면 산만해지고 "테크 데모"처럼 보여 장엄함이 깎인다.

### 기본 파라미터

| 파라미터 | 데스크톱 | 모바일 |
|---|---|---|
| 별 개수 | 620 | 260 |
| 성운 세기 | 1.0 | 1.0 |
| **마우스** 시차 | 1.0 | 0 (포인터 없음) |
| **스크롤** 시차 | 1.0 | 1.0 |
| 중력 렌즈 | 활성 | 비활성 |
| DPR 상한 | 2 | 1.5 |

마우스 시차와 스크롤 시차는 별개의 입력이다. 모바일에는 호버 포인터가 없으므로 마우스 시차와 중력 렌즈만 끄고, **스크롤 시차는 그대로 유지한다.** 모바일에서 공간감을 만드는 유일한 인터랙션이 스크롤이기 때문이다.

분기 기준은 화면 폭이 아니라 `matchMedia('(hover: hover) and (pointer: fine)')`다. 화면 폭으로 나누면 터치스크린 노트북에서 오판한다.

## 6. 성능과 접근성

이 항목들이 실패하면 사이트 전체가 실패한다.

### prefers-reduced-motion — 타협 불가

`prefers-reduced-motion: reduce`가 켜져 있으면 애니메이션 루프를 시작하지 않고 **정적 1프레임만 렌더**한다. 전정기관 장애가 있는 사용자에게 시차와 중력 왜곡은 실제로 어지럼증을 유발한다.

### 그 외

- **모바일**: 마우스 시차와 중력 렌즈를 끄고(스크롤 시차는 유지) 별 개수와 DPR을 낮춘다. 발열·배터리와 직결된다
- **탭 비활성화**: `document.visibilityState === 'hidden'`이면 rAF를 정지한다
- **리사이즈**: 디바운스 후 캔버스 재구성. 별 좌표는 정규화(0–1)로 보관해 리사이즈에도 분포가 유지된다
- **캔버스**: `pointer-events: none`, `aria-hidden="true"`. 스크린 리더와 클릭을 방해하지 않는다
- **JS 비활성 환경**: 캔버스가 안 뜨더라도 콘텐츠는 정적 HTML로 전부 읽힌다

## 7. 가독성 전략

별 위에 흰 글씨를 그대로 올리면 읽히지 않는다.

- **히어로**: 텍스트 뒤에 CSS radial gradient로 은은한 암부를 깐다. 캔버스는 건드리지 않는다
- **본문 섹션**: `GlassPanel` 컴포넌트 — `background: rgba(8,10,22,.55)` + `backdrop-filter: blur(12px)` + 옅은 보더. 우주가 비쳐 보이되 본문 대비는 **WCAG AA(4.5:1)** 를 넘긴다
- **하단 비네트**: 화면 아래로 갈수록 어두워져 스크롤로 올라오는 콘텐츠가 배경에 묻히지 않는다

## 8. 데이터 모델

```typescript
type ProjectStatus = 'live' | 'building';

type Project = {
  slug: string;
  name: string;
  tagline: string;        // 한 줄 설명
  url: string;
  status: ProjectStatus;  // building이면 카드에 배지 표시
  tech: string[];
  accent?: string;        // 호버 시 발광색
};

type Channel = {
  kind: 'instagram' | 'github' | 'email' | 'blog';
  label: string;
  href: string;
};

type Profile = {
  displayName: string;
  role: string;
  heroCopy: string;
  intro: string[];        // 문단 배열
};
```

새 앱을 배포하면 `projects.ts` 배열에 객체 하나를 추가하고 push한다. 타입이 있으므로 필드를 빠뜨리면 빌드가 실패한다. 폼 UI보다 안전하다.

### 미정 항목

아래는 아직 정해지지 않았다. `TODO:` 주석과 함께 플레이스홀더로 채우고, 값이 정해지면 데이터 파일만 수정한다.

- 프로젝트 4개의 정확한 이름 / URL / 설명 / 기술 태그
  - 확정: `todo.cosmoslog.org` (운영 중)
  - 미정: Notion CMS형 블로그, 모임 주최 앱, 여행 계획 앱 — 모두 Vercel 배포, URL 미확인
- 인스타그램 핸들, 블로그 주소
- GitHub 계정 (`github.com/odddman44`으로 추정, 확인 필요)
- 표기 이름(활동명 "오드" vs 실명), 프로필 사진 사용 여부
- 히어로 카피 — 시안 "기록이 쌓이면 궤도가 됩니다"는 임시안
- 브랜드 컬러 — 현재 indigo·violet·cyan·pink는 임의값

**빈 링크는 넣지 않는다.** 기존 사이트의 `href="#"` LinkedIn 링크처럼 클릭해도 아무 일이 없는 링크는 없느니만 못하다. 값이 미정인 채널은 렌더링에서 제외한다.

## 9. 배포

### 빌드 설정

```javascript
// next.config.ts
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },  // static export는 이미지 최적화 서버가 없다
};
```

`me.cosmoslog.org`는 그 서브도메인의 루트이므로 `basePath`는 설정하지 않는다.

### GitHub Actions

`main` 브랜치 push → `next build` → `out/` → `actions/upload-pages-artifact` → `actions/deploy-pages`.

`out/.nojekyll`을 생성한다. 공식 Pages 배포 액션은 Jekyll을 거치지 않아 엄밀히는 불필요하지만, 나중에 `gh-pages` 브랜치 방식으로 바꿀 때 `_next/` 폴더가 조용히 누락되는 사고를 막는 보험이다.

### 도메인

- `public/CNAME` = `me.cosmoslog.org`
- DNS: `me` **CNAME** → `odddman44.github.io`

서브도메인이므로 CNAME 레코드 하나면 된다. A 레코드 4개는 루트(apex) 도메인을 GitHub Pages에 붙일 때만 필요한데, 루트는 추후 플랫폼이 쓸 자리이므로 건드리지 않는다.

도메인 소유권 확인을 위해 GitHub 계정 설정에서 도메인 verification을 함께 해두면, 다른 사용자가 같은 도메인을 자기 Pages에 붙이는 takeover를 막을 수 있다.

**주의**: 커스텀 도메인을 연결하기 전까지 `odddman44.github.io/my-profile`에서는 경로 불일치로 스타일이 깨진다. `basePath`가 없기 때문이며 정상이다. 확인은 로컬 `next dev` 또는 도메인 연결 후에 한다.

## 10. 기존 코드 처리

현재 `index.html` / `style.css` / `script.js`(총 610줄)는 Next.js 구조로 대체되며 삭제한다. 다만 아래 두 가지는 살려서 옮긴다.

- `IntersectionObserver` 기반 스크롤 진입 애니메이션 — 구조가 깔끔하다. 진입 방향(위/좌/우)과 지연을 데이터 속성으로 지정하는 방식을 유지한다
- 스크롤 진행도 바 — 화면 최상단 1~2px 높이의 발광하는 선으로 다시 만든다. 기존의 불투명한 인디고 바가 아니라 별빛에 가까운 밝기의 얇은 선이다

기존 라이트 테마(slate·indigo), Tailwind CDN, Font Awesome CDN은 모두 제거한다. `cdn.tailwindcss.com`은 브라우저에서 CSS를 실시간 생성하는 방식이라 프로덕션 사용이 권장되지 않는다. 아이콘은 필요한 것만 인라인 SVG로 넣어 CDN 의존을 없앤다.

## 11. 범위 밖

의도적으로 만들지 않는다.

- **관리 UI / 데이터베이스** — 1년에 몇 번 바뀌는 데이터를 위해 DB·인증·CRUD를 짊어질 이유가 없다. DB가 붙는 순간 정적 배포가 불가능해져 인프라가 통째로 달라진다
- **블로그 글 자동 수집** — 지금은 링크만. 나중에 Notion CMS 앱을 소스로 빌드 타임에 fetch하는 길은 열려 있다
- **라이트 모드 토글**
- **프로젝트 상세 페이지** — 각 앱이 이미 배포되어 있으므로 외부 링크로 충분하다
- **다국어**
- **cosmoslog 글쓰기 플랫폼과의 연동** — 아직 존재하지 않는다

## 12. 검증 기준

구현 완료를 판단하는 기준이다.

1. `engine.ts`가 React 없이 단독으로 동작하고, 파라미터를 바꾸면 렌더 결과가 달라진다
2. 마우스를 움직이지 않아도 배경이 살아 있다 (반짝임 + 드리프트 + 성운 유영)
3. `prefers-reduced-motion: reduce`에서 애니메이션이 정지하고 정적 화면이 렌더된다
4. 모바일 실기기에서 스크롤 중 프레임이 눈에 띄게 끊기지 않는다 (목표 60fps, 최소 30fps 유지)
5. 모든 본문 텍스트가 배경 위에서 대비 4.5:1 이상이다
6. `projects.ts`에 객체를 하나 추가하면 카드가 하나 늘어난다
7. `next build`가 통과하고 `out/`에 정적 파일이 생성된다
8. 빈 링크(`href="#"`)가 하나도 없다
