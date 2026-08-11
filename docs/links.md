# 링크·도메인 수정 가이드

프로젝트 도메인을 하나씩 붙여나갈 때 **어디를 고쳐야 하는지**만 정리한 문서다.

사이트 코드에서 URL이 존재하는 곳은 `src/data/` 3개 파일과 `src/app/layout.tsx` 뿐이다.
별(성좌)은 이 데이터를 읽어 자동으로 생성되므로, 컴포넌트나 렌더링 엔진은 건드릴 일이 없다.

---

## 1. 기존 프로젝트에 도메인을 붙였을 때

`src/data/projects.ts`에서 해당 항목의 `url`만 바꾼다.

`// TODO: 실제 Vercel 배포 URL로 교체 필요` 주석이 붙어 있는 항목이 아직 placeholder(`https://vercel.com`)다.
주소를 넣었으면 그 주석도 같이 지운다.

## 2. 새 프로젝트(= 새 별)를 추가할 때

`src/data/projects.ts` 배열에 객체 하나를 추가하면 끝이다.

```ts
{
  slug: 'gallery',                       // 유일해야 한다 (테스트가 중복을 검사)
  name: 'Gallery',                       // 별 라벨 + 패널 제목
  tagline: '사진을 모아보는 앱',            // 패널 본문 한 줄
  url: 'https://gallery.cosmoslog.org',  // 'http'로 시작해야 한다 (테스트가 검사)
  status: 'live',                        // 'live' | 'building' 만 가능
  tech: ['Next.js', 'TypeScript'],
  // accent: '52,211,153',               // 선택. 'R,G,B' 문자열
}
```

주의할 점 두 가지:

- **5번째부터 색이 반복된다.** `src/components/stage/Stage.tsx`의 `PROJECT_ACCENTS`가 4색 순환이라
  5번째 프로젝트는 1번째와 같은 색을 쓴다. 색을 구분하려면 그 배열에 색을 추가하거나
  프로젝트에 `accent`를 직접 지정한다.
- **10개까지는 궤도 하나, 11개부터 두 궤도로 갈라진다.** `src/components/cosmos/orbit.ts`의
  `MAX_PER_RING`이 자동으로 처리하므로 손댈 필요 없다.

## 3. 채널(GitHub·인스타그램·블로그 등)을 추가할 때

`src/data/channels.ts`에 추가한다.

```ts
{ kind: 'blog', label: 'Blog', href: 'https://blog.cosmoslog.org' },
```

- `kind`는 `src/types/index.ts`의 `ChannelKind` 유니온에 있는 값만 쓸 수 있다
  (`'instagram' | 'github' | 'email' | 'blog'`). 새 종류가 필요하면 유니온에 먼저 추가한다.
- `kind`가 React key이자 별 id로 쓰이므로 중복될 수 없다.
- **주소가 아직 없는 채널은 배열에 넣지 않는다.** 빈 링크(`'#'`, `''`)는 테스트가 막는다.

## 4. 이 사이트 본체 도메인을 바꿀 때

`src/app/layout.tsx`의 `metadataBase`와 `openGraph.url` **두 곳**을 함께 바꾼다.
OG 메타데이터용이라 한쪽만 고치고 넘어가기 쉽다.

## 5. 수정 후 검증

```bash
npm run typecheck && npm run test && npm run build
```

- `src/data/data.test.ts` — slug 중복, `http` 시작, 빈 링크를 검사한다.
- `src/app/accessibility.test.tsx` — 데이터 기준으로 별이 실제 렌더되는지 확인한다.

---

## 알아둘 것

- `src/components/stage/stars.test.tsx`와 `panel.test.tsx`에도 `https://todo.cosmoslog.org`가
  있지만 이건 테스트 픽스처이고 실제 데이터와 무관하다. **건드리지 않는다.**
- 프록시/도메인 연결 자체(Vercel 도메인 추가, DNS CNAME)는 이 레포에 설정이 없다.
  `next.config.ts`가 `output: 'export'` 정적 빌드라 rewrite도 쓰지 않는다.
  즉 **도메인 작업은 Vercel 대시보드에서, 코드는 위 파일들만** 고치는 2단 구조다.
