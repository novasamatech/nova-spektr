import { fork, allSettled } from 'effector';

import { vaultDetailsModel } from '../vault-details-model';
import { ShardAccount, Chain, type ChainAccount, DraftAccount } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { storageService } from '@shared/api/storage';
import { TEST_ACCOUNTS } from '@shared/lib/utils';

describe('widgets/WalletDetails/model/vault-details-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $shards on shardsSelected', async () => {
    const shard = { id: 1, name: 'My shard' } as ShardAccount;
    const scope = fork();

    await allSettled(vaultDetailsModel.events.shardsSelected, { scope, params: [shard] });
    expect(scope.getState(vaultDetailsModel.$shards)).toEqual([shard]);
  });

  test('should clear $shards & $chain on shardsCleared', async () => {
    const scope = fork({
      values: new Map()
        .set(vaultDetailsModel.$shards, [{ id: 1, name: 'My shard' } as ShardAccount])
        .set(vaultDetailsModel.$chain, { chainId: '0x00' } as unknown as Chain),
    });

    await allSettled(vaultDetailsModel.events.shardsCleared, { scope });
    expect(scope.getState(vaultDetailsModel.$shards)).toEqual([]);
    expect(scope.getState(vaultDetailsModel.$chain)).toEqual({});
  });

  test('should set $keysToAdd on keysAdded', async () => {
    const key = { name: 'My shard' } as DraftAccount<ChainAccount>;
    const scope = fork();

    await allSettled(vaultDetailsModel.events.keysAdded, { scope, params: [key] });
    expect(scope.getState(vaultDetailsModel.$keysToAdd)).toEqual([key]);
  });

  test('should update $accounts on keysRemoved', async () => {
    const key = { id: 1, name: 'My shard' } as ChainAccount;
    jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1]);

    const scope = fork({
      values: new Map().set(walletModel.$accounts, [key]),
    });

    await allSettled(vaultDetailsModel.events.keysRemoved, { scope, params: [key] });
    expect(scope.getState(walletModel.$accounts)).toEqual([]);
  });

  test('should update $accounts on accountsCreated', async () => {
    const walletId = 1;
    const key = { id: 1, name: 'My shard' } as unknown as DraftAccount<ChainAccount>;
    const params = { walletId, rootAccountId: TEST_ACCOUNTS[0], accounts: [key] };

    jest.spyOn(storageService.accounts, 'createAll').mockResolvedValue([{ walletId, ...key } as ChainAccount]);

    const scope = fork();

    await allSettled(vaultDetailsModel.events.accountsCreated, { scope, params });
    expect(scope.getState(walletModel.$accounts)).toEqual([{ walletId, ...key }]);
  });
});
