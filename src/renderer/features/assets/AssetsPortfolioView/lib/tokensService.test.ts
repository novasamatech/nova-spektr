import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tokensService } from './tokensService';

const DOT_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const ASSET_HUB_CHAIN_ID = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f';

const tokensFixture = [
  {
    name: 'Polkadot',
    precision: 10,
    priceId: 'polkadot',
    icon: {
      monochrome: 'https://example.org/monochrome/DOT.svg',
      colored: 'https://example.org/colored/DOT.svg',
    },
    symbol: 'DOT',
    isTestToken: false,
    chains: [
      { chainId: DOT_CHAIN_ID, name: 'Polkadot Relay', assetId: 0, assetSymbol: 'DOT', type: 'native' },
      {
        chainId: ASSET_HUB_CHAIN_ID,
        name: 'Polkadot Asset Hub',
        assetId: 1,
        assetSymbol: 'DOT',
        type: 'statemine',
        typeExtras: { assetId: '0x02010902', palletName: 'ForeignAssets' },
      },
    ],
  },
];

function mockFetch(response: Partial<Response>) {
  global.fetch = vi.fn(() => Promise.resolve(response as Response));
}

function mockFetchJson(body: unknown) {
  mockFetch({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

describe('tokensService.getTokensData', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed config when the remote payload matches the schema', async () => {
    mockFetchJson(tokensFixture);

    const tokens = await tokensService.getTokensData();

    expect(tokens).toEqual(tokensFixture);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('keeps unknown keys and accepts an unpinned asset type', async () => {
    const token = {
      ...tokensFixture[0]!,
      newFlag: true,
      chains: [{ ...tokensFixture[0]!.chains[0]!, type: 'new_type' }],
    };
    mockFetchJson([token]);

    const tokens = await tokensService.getTokensData();

    expect(tokens).toEqual([token]);
  });

  it('returns null and logs when the response is not ok', async () => {
    mockFetch({ ok: false, status: 503, statusText: 'Service Unavailable' });

    const tokens = await tokensService.getTokensData();

    expect(tokens).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('503'));
  });

  it('returns null and logs when the body is not JSON', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected token <')) });

    const tokens = await tokensService.getTokensData();

    expect(tokens).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('JSON'), expect.any(SyntaxError));
  });

  it('returns null and logs the nested path when a chain entry is malformed', async () => {
    const token = { ...tokensFixture[0]!, chains: [{ ...tokensFixture[0]!.chains[0]!, chainId: '0x123' }] };
    mockFetchJson([token]);

    const tokens = await tokensService.getTokensData();

    expect(tokens).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('0.chains.0.chainId'));
  });

  it('returns null and logs when the payload is not an array', async () => {
    mockFetchJson({ tokens: tokensFixture });

    const tokens = await tokensService.getTokensData();

    expect(tokens).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});
