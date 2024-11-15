import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type Chain, type ChainAccount, type DraftAccount, type ShardAccount } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { walletModel } from '@/entities/wallet';
import { vaultDetailsModel } from '../vault-details-model';

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

  test('should update $wallets on keysRemoved', async () => {
    const wallet = {
      id: 1,
      name: 'My wallet',
      accounts: [
        { id: 1, walletId: 1, name: 'My first shard' },
        { id: 2, walletId: 1, name: 'My second shard' },
      ],
    };
    jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1]);

    const scope = fork({
      values: new Map().set(walletModel._test.$allWallets, [wallet]),
    });

    await allSettled(vaultDetailsModel.events.keysRemoved, { scope, params: [wallet.accounts[0]] });
    expect(scope.getState(walletModel.$wallets)).toEqual([{ ...wallet, accounts: [wallet.accounts[1]] }]);
  });

  test('should update $wallets on accountsCreated', async () => {
    const wallet = {
      id: 1,
      name: 'My wallet',
      accounts: [{ id: 1, walletId: 1, name: 'My first shard' }],
    };

    const key = { id: 2, name: 'My second shard' } as unknown as DraftAccount<ChainAccount>;
    const params = { walletId: wallet.id, rootAccountId: TEST_ACCOUNTS[0], accounts: [key] };
    const newAccount = { walletId: wallet.id, ...key } as ChainAccount;

    jest.spyOn(storageService.accounts, 'createAll').mockResolvedValue([newAccount]);

    const scope = fork({
      values: new Map().set(walletModel._test.$allWallets, [wallet]),
    });

    await allSettled(vaultDetailsModel.events.accountsCreated, { scope, params });
    expect(scope.getState(walletModel.$wallets)).toEqual([{ ...wallet, accounts: [wallet.accounts[0], newAccount] }]);
  });
});
