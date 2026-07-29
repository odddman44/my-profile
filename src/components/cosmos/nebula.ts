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
