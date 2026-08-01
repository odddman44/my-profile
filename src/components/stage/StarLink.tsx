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
      // onFocus는 의도적으로 달지 않는다. 포커스로 궤도를 돌리면 Tab을 누를 때마다
      // 화면 전체가 회전해 키보드 사용자가 방향 감각을 잃는다. 회전은 명시적인 클릭에서만 일어난다.
      onClick={(event) => {
        // 새 탭(⌘/Ctrl)·새 창(Shift)으로 여는 조작은 브라우저에 맡긴다.
        // 링크처럼 생긴 것이 링크처럼 동작하지 않으면 사용자는 고장으로 받아들인다.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        // 평범한 클릭은 패널을 여는 데 쓴다. 실제 이동은 패널 안의 링크가 맡는다.
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
