import { allSettled, fork } from 'effector';

import { type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { accounts } from '@/domains/network';
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
        .set(accounts.__test.$list, vaultAccounts)
        .set(networkModel.$chains, chainsMap),
    });

    await allSettled(shardsModel.events.structureRequested, { scope, params: true });

    const shards = [(vaultAccounts[0] as VaultShardAccount).chainId, [[vaultAccounts[0], vaultAccounts[1]]]];
    const accounts_1 = [(vaultAccounts[3] as VaultChainAccount).chainId, [vaultAccounts[3]]];
    const accounts_2 = [(vaultAccounts[2] as VaultChainAccount).chainId, [vaultAccounts[2]]];

    const tuples = [[vaultWallet.rootAccountId, [accounts_1, accounts_2, shards]]];

    expect(scope.getState(shardsModel.$shardsStructure)).toEqual(tuples);
  });
});
