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
/** 이보다 적게 움직이면 드래그가 아니라 클릭으로 본다 */
const CLICK_MOVE_THRESHOLD = 6;

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coreRef = useRef<HTMLButtonElement>(null);
  const handleRef = useRef<CosmosHandle | null>(null);
  const starRefs = useRef(new Map<string, HTMLAnchorElement>());
  const dragX = useRef<number | null>(null);
  // 빈 곳을 눌러 클릭인지 드래그인지 가리는 데 쓴다. 드래그로 성좌를 돌리는 사용자가
  // 패널을 잃지 않도록, 포인터가 거의 움직이지 않았을 때만 "클릭"으로 본다.
  const emptyClickStart = useRef<{ x: number; y: number } | null>(null);

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
    // 중심 항성도 별과 같은 settleT로 점화되도록 엔진에 등록한다 (F-4)
    if (coreRef.current) handle.setCoreElement(coreRef.current);

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
    // 빈 곳(별·중심 항성·패널이 아닌 곳)을 눌렀을 때만 닫기 후보로 기록한다
    const target = event.target as HTMLElement;
    const onInteractive = target.closest('a[data-star], button, [role="dialog"]') !== null;
    emptyClickStart.current =
      panel !== null && !onInteractive ? { x: event.clientX, y: event.clientY } : null;

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

  function onPointerUp(event: React.PointerEvent) {
    const start = emptyClickStart.current;
    endDrag();
    if (!start) return;
    const movedX = Math.abs(event.clientX - start.x);
    const movedY = Math.abs(event.clientY - start.y);
    // 드래그가 아니라 클릭일 때만 닫는다 — 빈 곳을 잡고 돌리던 사용자는 패널을 잃지 않는다
    if (movedX <= CLICK_MOVE_THRESHOLD && movedY <= CLICK_MOVE_THRESHOLD) {
      setPanel(null);
    }
  }

  function endDrag() {
    dragX.current = null;
    emptyClickStart.current = null;
  }

  return (
    <main
      className="relative h-screen w-screen overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={endDrag}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <CoreStar ref={coreRef} profile={profile} onOpen={openProfile} />

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
