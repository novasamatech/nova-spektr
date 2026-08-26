import { resolveEraDepth } from '../range';

describe('resolveEraDepth', () => {
  test('should read the preset when the chain holds enough history', () => {
    expect(resolveEraDepth('7', 84)).toBe(7);
    expect(resolveEraDepth('30', 84)).toBe(30);
  });

  test('should clamp a preset to the eras the chain still keeps behind the active one', () => {
    expect(resolveEraDepth('30', 20)).toBe(19);
  });

  test('should read everything for max, and hold the read before the depth is known', () => {
    expect(resolveEraDepth('max', 84)).toBe(83);
    expect(resolveEraDepth('max', null)).toBeNull();
  });

  test('should trust a preset while the depth is unknown', () => {
    expect(resolveEraDepth('7', null)).toBe(7);
  });
});
