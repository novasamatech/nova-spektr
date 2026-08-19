import { describe, expect, it } from 'vitest';

import { type Chain, type ChainId, ExternalType } from '@/shared/core';
import { AssetHubChains } from '../constants';

import { collectChainRewardSources } from './service';

const RELAY_ID: ChainId = '0x0000000000000000000000000000000000000000000000000000000000000001';
const PARACHAIN_ID: ChainId = '0x0000000000000000000000000000000000000000000000000000000000000002';
const ASSET_HUB_ID = AssetHubChains.POLKADOT_AH;

type ChainDraft = Partial<Chain> & Pick<Chain, 'chainId'>;

const makeChain = ({ chainId, ...rest }: ChainDraft): Chain => ({
  chainId,
  specName: 'test',
  name: 'Test',
  assets: [],
  nodes: [],
  icon: '',
  addressPrefix: 42,
  ...rest,
});

const relay = makeChain({
  chainId: RELAY_ID,
  addressPrefix: 0,
  externalApi: {
    [ExternalType.STAKING]: [{ type: 'subquery', url: 'https://relay/staking' }],
    [ExternalType.HISTORY]: [{ type: 'subquery', url: 'https://relay/history' }],
  },
});

const assetHub = makeChain({
  chainId: ASSET_HUB_ID,
  parentId: RELAY_ID,
  addressPrefix: 0,
  externalApi: {
    [ExternalType.STAKING]: [{ type: 'subquery', url: 'https://hub/staking' }],
    [ExternalType.HISTORY]: [{ type: 'subquery', url: 'https://hub/history' }],
  },
});

/** A child of the relay that is not an Asset Hub — never a reward source. */
const parachain = makeChain({
  chainId: PARACHAIN_ID,
  parentId: RELAY_ID,
  externalApi: {
    [ExternalType.STAKING]: [{ type: 'subquery', url: 'https://parachain/staking' }],
    [ExternalType.HISTORY]: [{ type: 'subquery', url: 'https://parachain/history' }],
  },
});

const chainsMap: Record<ChainId, Chain> = {
  [RELAY_ID]: relay,
  [ASSET_HUB_ID]: assetHub,
  [PARACHAIN_ID]: parachain,
};

const urlsOf = (chain: Chain, scope: 'staking-chain' | 'chain-family', map = chainsMap) =>
  collectChainRewardSources(chain, map, scope).map(source => source.url);

describe('collectChainRewardSources', () => {
  describe('staking-chain scope', () => {
    it('reads the hub and the relay it migrated from — pre-migration rewards only exist there', () => {
      expect(urlsOf(assetHub, 'staking-chain')).toEqual([
        'https://hub/staking',
        'https://hub/history',
        'https://relay/staking',
      ]);
    });

    it('stays on the chain itself when it has no parent', () => {
      expect(urlsOf(relay, 'staking-chain')).toEqual(['https://relay/staking', 'https://relay/history']);
    });

    it('trusts the caller for a chain that is not an Asset Hub', () => {
      expect(urlsOf(parachain, 'staking-chain')).toEqual([
        'https://parachain/staking',
        'https://parachain/history',
        'https://relay/staking',
      ]);
    });

    it('never walks down to child chains', () => {
      expect(urlsOf(relay, 'staking-chain')).not.toContain('https://hub/history');
    });
  });

  describe('chain-family scope', () => {
    it('follows a relay down to its Asset Hub, where the stake lives now', () => {
      expect(urlsOf(relay, 'chain-family')).toEqual(['https://relay/staking', 'https://hub/history']);
    });

    it('ignores children that are not Asset Hubs', () => {
      expect(urlsOf(relay, 'chain-family')).not.toContain('https://parachain/history');
    });

    it('resolves an Asset Hub the same way as the staking-chain scope', () => {
      expect(urlsOf(assetHub, 'chain-family')).toEqual([
        'https://hub/staking',
        'https://hub/history',
        'https://relay/staking',
      ]);
    });

    it('takes only the staking endpoint of a chain that is neither hub nor parent of one', () => {
      expect(urlsOf(parachain, 'chain-family')).toEqual(['https://parachain/staking']);
    });

    it('skips a missing parent instead of throwing', () => {
      const orphanHub = makeChain({ ...assetHub, parentId: PARACHAIN_ID });

      expect(urlsOf(orphanHub, 'chain-family', { [ASSET_HUB_ID]: orphanHub })).toEqual([
        'https://hub/staking',
        'https://hub/history',
      ]);
    });
  });

  it('returns nothing for a chain without external apis', () => {
    const bare = makeChain({ chainId: PARACHAIN_ID });

    expect(urlsOf(bare, 'staking-chain')).toEqual([]);
    expect(urlsOf(bare, 'chain-family')).toEqual([]);
  });

  it('keeps a url once, with the prefix of the chain that first claimed it', () => {
    const shared = makeChain({
      chainId: ASSET_HUB_ID,
      parentId: RELAY_ID,
      addressPrefix: 2,
      externalApi: {
        [ExternalType.STAKING]: [{ type: 'subquery', url: 'https://shared' }],
        [ExternalType.HISTORY]: [{ type: 'subquery', url: 'https://shared' }],
      },
    });

    const sources = collectChainRewardSources(shared, { [ASSET_HUB_ID]: shared }, 'staking-chain');

    expect(sources).toEqual([{ url: 'https://shared', addressPrefix: 2 }]);
  });

  it('ignores endpoints that are not subquery indexers', () => {
    const githubBacked = makeChain({
      chainId: PARACHAIN_ID,
      externalApi: {
        [ExternalType.STAKING]: [
          { type: 'github', url: 'https://github/staking' },
          { type: 'subquery', url: 'https://subquery/staking' },
        ],
      },
    });

    expect(urlsOf(githubBacked, 'staking-chain')).toEqual(['https://subquery/staking']);
  });
});
