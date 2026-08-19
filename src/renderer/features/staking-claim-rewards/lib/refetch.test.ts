import { type ApiPromise } from '@polkadot/api';
import { TypeRegistry } from '@polkadot/types';
import { describe, expect, it } from 'vitest';

import { type Asset, type Chain, type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type ClaimedRewards } from '../types';

import { buildPayoutRefetchParams } from './refetch';

const registry = new TypeRegistry();

const CHAIN_ID = '0x01' as ChainId;

const stakingApi = (historyDepth: number) =>
  ({ consts: { staking: { historyDepth: registry.createType('u32', historyDepth) } } }) as unknown as ApiPromise;

const chain = () => ({ chainId: CHAIN_ID, name: 'Polkadot', addressPrefix: 0 }) as unknown as Chain;

const claimed = (accountIds: string[]): ClaimedRewards => ({
  chain: chain(),
  asset: { assetId: 0, symbol: 'DOT', precision: 10 } as unknown as Asset,
  total: '10',
  claims: accountIds.map((accountId) => ({
    account: { accountId } as unknown as AnyAccount,
    payouts: [],
    amount: '5',
  })),
});

const apis = { [CHAIN_ID]: stakingApi(84) };
const chains = { [CHAIN_ID]: chain() };
const eras = { [CHAIN_ID]: 1500 as EraIndex };

describe('buildPayoutRefetchParams', () => {
  it('builds one request per claimed stash', () => {
    const params = buildPayoutRefetchParams({ claimed: claimed(['0xaa', '0xbb']), apis, chains, eras });

    expect(params).toHaveLength(2);
    expect(params.map((p) => p.stash)).toEqual(['0xaa' as AccountId, '0xbb' as AccountId]);
    expect(params[0]).toMatchObject({ chainId: CHAIN_ID, activeEra: 1500, historyDepth: 84 });
  });

  it('asks for nothing when the active era is unknown — the cache key would be wrong', () => {
    expect(buildPayoutRefetchParams({ claimed: claimed(['0xaa']), apis, chains, eras: {} })).toEqual([]);
  });

  it('asks for nothing without an api', () => {
    expect(buildPayoutRefetchParams({ claimed: claimed(['0xaa']), apis: {}, chains, eras })).toEqual([]);
  });

  it('asks for nothing when the chain has no staking pallet', () => {
    const apisWithoutStaking = { [CHAIN_ID]: { consts: {} } as unknown as ApiPromise };

    expect(buildPayoutRefetchParams({ claimed: claimed(['0xaa']), apis: apisWithoutStaking, chains, eras })).toEqual(
      [],
    );
  });
});
