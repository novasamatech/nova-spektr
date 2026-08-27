import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { chainsService } from '../chainsService';

import chainsFixture from './fixtures/chains.fixture.json';

function mockFetch(response: Partial<Response>) {
  global.fetch = vi.fn(() => Promise.resolve(response as Response));
}

function mockFetchJson(body: unknown) {
  mockFetch({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

describe('chainsService.getChainsData', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed config when the remote payload matches the schema', async () => {
    mockFetchJson(chainsFixture);

    const chains = await chainsService.getChainsData();

    expect(chains).toEqual(chainsFixture);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('returns null and logs when the response is not ok', async () => {
    mockFetch({ ok: false, status: 503, statusText: 'Service Unavailable' });

    const chains = await chainsService.getChainsData();

    expect(chains).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('503'));
  });

  it('keeps unknown keys and accepts unpinned enum-like strings', async () => {
    const chain = {
      ...chainsFixture[0],
      futureKey: { nested: true },
      options: ['some_new_flag'],
      assets: [{ ...chainsFixture[0]!.assets[0], type: 'new_type' }],
    };
    mockFetchJson([chain]);

    const chains = await chainsService.getChainsData();

    expect(chains).toEqual([chain]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('returns null and logs when the body is not JSON', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected token <')) });

    const chains = await chainsService.getChainsData();

    expect(chains).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('JSON'), expect.any(SyntaxError));
  });

  it('returns null and logs the nested path of a malformed asset', async () => {
    mockFetchJson([{ ...chainsFixture[0], assets: [{ ...chainsFixture[0]!.assets[0], precision: '10' }] }]);

    const chains = await chainsService.getChainsData();

    expect(chains).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('0.assets.0.precision'));
  });

  it('returns null and logs when chainId is not a 32-byte hex hash', async () => {
    mockFetchJson([{ ...chainsFixture[0], chainId: '0x123' }]);

    const chains = await chainsService.getChainsData();

    expect(chains).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('0.chainId'));
  });

  it('returns null and logs when a chain is missing chainId', async () => {
    mockFetchJson([{ ...chainsFixture[0], chainId: undefined }]);

    const chains = await chainsService.getChainsData();

    expect(chains).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('chainId'));
  });

  it('returns null and logs when a field has the wrong type', async () => {
    mockFetchJson([{ ...chainsFixture[0], addressPrefix: '0' }]);

    const chains = await chainsService.getChainsData();

    expect(chains).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('addressPrefix'));
  });

  it('returns null and logs when the payload is not an array', async () => {
    mockFetchJson({ chains: chainsFixture });

    const chains = await chainsService.getChainsData();

    expect(chains).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});
