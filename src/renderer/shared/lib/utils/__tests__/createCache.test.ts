import { createCache } from '../createCache';

describe('createCache', () => {
  it('should serve a value within its lifetime', async () => {
    const cache = createCache<string, number>({ now: () => 1000 });

    cache.set('key', 1, 100);

    expect(await cache.get('key')).toBe(1);
  });

  // A zero lifetime means "never answer from cache". Keeping such records only
  // grows the map: resources with staleAfter 0 get a fresh key on every
  // snapshot change, and nothing ever reads the old one back.
  it('should not keep a value with no lifetime', async () => {
    const cache = createCache<string, number>({ now: () => 1000 });

    cache.set('key', 1, 0);

    expect(await cache.get('key')).toBeNull();
  });

  it('should share an in-flight request even with no lifetime', async () => {
    const cache = createCache<string, number>({ now: () => 1000 });
    let resolve: (value: number) => void = () => {};

    const request = cache.setAny('key', new Promise<number>((r) => (resolve = r)), 0);
    const pending = cache.get('key');
    resolve(1);
    await request;

    expect(await pending).toBe(1);
  });
});
