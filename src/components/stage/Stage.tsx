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
