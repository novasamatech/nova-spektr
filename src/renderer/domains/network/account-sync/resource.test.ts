import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';

const { graphqlRequestMock } = vi.hoisted(() => ({
  graphqlRequestMock: vi.fn(async () => ({ _metadatas: { nodes: [] as unknown[] } })),
}));
vi.mock('graphql-request', () => {
  class MockGraphQLClient {
    request = graphqlRequestMock;
  }
  return { gql: (s: TemplateStringsArray) => s.join(''), GraphQLClient: MockGraphQLClient };
});

const POLKADOT = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;
const COLLECTIVES = '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2' as ChainId;

describe('indexedBlocksProvider', () => {
  beforeEach(() => {
    graphqlRequestMock.mockClear();
  });

  it('skips chains with a null lastProcessedHeight instead of failing the whole sync', async () => {
    const { indexedBlocksProvider } = await import('./resource');

    graphqlRequestMock.mockResolvedValueOnce({
      _metadatas: {
        nodes: [
          { chain: 'Polkadot', genesisHash: POLKADOT, lastProcessedHeight: 31992635 },
          { chain: 'Collectives', genesisHash: COLLECTIVES, lastProcessedHeight: null },
        ],
      },
    });

    const result = await indexedBlocksProvider.fn();

    expect(result.get(POLKADOT)).toBe(31992635);
    expect(result.has(COLLECTIVES)).toBe(false);
  }, 30_000);

  it('maps every indexed chain to its height', async () => {
    const { indexedBlocksProvider } = await import('./resource');

    graphqlRequestMock.mockResolvedValueOnce({
      _metadatas: {
        nodes: [{ chain: 'Polkadot', genesisHash: POLKADOT, lastProcessedHeight: 100 }],
      },
    });

    const result = await indexedBlocksProvider.fn();

    expect(result.size).toBe(1);
    expect(result.get(POLKADOT)).toBe(100);
  }, 30_000);
});
