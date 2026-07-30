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
