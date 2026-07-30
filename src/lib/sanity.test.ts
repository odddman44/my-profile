import { describe, expect, it } from 'vitest';

describe('테스트 환경', () => {
  it('jsdom 환경에서 document에 접근할 수 있다', () => {
    expect(typeof document).toBe('object');
  });

  it('산술 결과를 검증한다', () => {
    expect(1 + 1).toBe(2);
  });
});
