import { allSettled, fork } from 'effector';

import { type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import * as networkDomain from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { shardsModel } from '../shards-model';

import { shardsMock } from './mocks/shards-mock';

describe('features/wallet/model/shards-model', () => {
  test('should create $walletStructure for vaultAccounts with sorted chains', async () => {
    const { vaultWallet, vaultAccounts, chainsMap } = shardsMock;

    const scope = fork({
      values: new Map()
        .set(walletModel.__test.$rawWallets, [vaultWallet])
        .set(networkDomain.accounts.__test.$list, vaultAccounts)
        .set(networkModel.$chains, chainsMap),
    });

    await allSettled(shardsModel.events.structureRequested, { scope, params: true });

    const root = vaultAccounts[4];
    const shards = [(vaultAccounts[0] as VaultShardAccount).chainId, [[vaultAccounts[0], vaultAccounts[1]]]];
    const accounts_1 = [(vaultAccounts[3] as VaultChainAccount).chainId, [vaultAccounts[3]]];
    const accounts_2 = [(vaultAccounts[2] as VaultChainAccount).chainId, [vaultAccounts[2]]];

    const tuples = [[root, [accounts_1, accounts_2, shards]]];

    expect(scope.getState(shardsModel.$shardsStructure)).toEqual(tuples);
  });

  test('should create $walletStructure for multishardAccounts with sorted chains', async () => {
    const { multishardWallet, multishardAccounts, chainsMap } = shardsMock;

    const scope = fork({
      values: new Map()
        .set(networkDomain.accounts.__test.$list, multishardAccounts)
        .set(walletModel.__test.$rawWallets, [multishardWallet])
        .set(networkModel.$chains, chainsMap),
    });

    await allSettled(shardsModel.events.structureRequested, { scope, params: true });

    const root_1 = multishardAccounts[2];
    const accounts_1_1 = [(multishardAccounts[1] as VaultChainAccount).chainId, [multishardAccounts[1]]];
    const accounts_1_2 = [(multishardAccounts[0] as VaultChainAccount).chainId, [multishardAccounts[0]]];

    const root_2 = multishardAccounts[5];
    const accounts_2_1 = [(multishardAccounts[4] as VaultChainAccount).chainId, [multishardAccounts[4]]];
    const accounts_2_2 = [(multishardAccounts[3] as VaultChainAccount).chainId, [multishardAccounts[3]]];

    const tuples = [
      [root_1, [accounts_1_1, accounts_1_2]],
      [root_2, [accounts_2_1, accounts_2_2]],
    ];

    expect(scope.getState(shardsModel.$shardsStructure)).toEqual(tuples);
  });
});
