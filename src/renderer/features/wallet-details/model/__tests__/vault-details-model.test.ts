import { allSettled, fork } from 'effector';

import { type Chain, type DraftAccount, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { type AnyAccount, accounts } from '@/domains/network';
import { vaultDetailsModel } from '../vault-details-model';

describe('widgets/WalletDetails/model/vault-details-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $shards on shardsSelected', async () => {
    const shard = { name: 'My shard' } as VaultShardAccount;
    const scope = fork();

    await allSettled(vaultDetailsModel.events.shardsSelected, { scope, params: [shard] });
    expect(scope.getState(vaultDetailsModel.$shards)).toEqual([shard]);
  });

  test('should clear $shards & $chain on shardsCleared', async () => {
    const scope = fork({
      values: new Map()
        .set(vaultDetailsModel.$shards, [{ name: 'My shard' } as VaultShardAccount])
        .set(vaultDetailsModel.$chain, { chainId: '0x00' } as unknown as Chain),
    });

    await allSettled(vaultDetailsModel.events.shardsCleared, { scope });
    expect(scope.getState(vaultDetailsModel.$shards)).toEqual([]);
    expect(scope.getState(vaultDetailsModel.$chain)).toEqual({});
  });

  test('should set $keysToAdd on keysAdded', async () => {
    const key = { name: 'My shard' } as DraftAccount<VaultChainAccount>;
    const scope = fork();

    await allSettled(vaultDetailsModel.events.keysAdded, { scope, params: [key] });
    expect(scope.getState(vaultDetailsModel.$keysToAdd)).toEqual([key]);
  });

  test('should update accounts on keysRemoved', async () => {
    const testAccounts = [
      { accountId: '0x00', walletId: 1, name: 'My first shard' },
      { accountId: '0x01', walletId: 1, name: 'My second shard' },
    ];

    const scope = fork({
      values: [[accounts.__test.$list, testAccounts]],
      handlers: [[accounts.updateAccount, () => {}]],
    });

    await allSettled(vaultDetailsModel.events.keysRemoved, { scope, params: [testAccounts[0]] });
    expect(scope.getState(accounts.$list)).toEqual([testAccounts[1]]);
  });

  // TODO check
  test('should update accounts on accountsCreated', async () => {
    const walletId = 1;
    const testAccounts = [{ accountId: '0x00', walletId, name: 'My first shard' }];

    const key = { name: 'My second shard' } as unknown as DraftAccount<VaultChainAccount>;
    const params = { walletId, rootAccountId: TEST_ACCOUNTS[0], accounts: [key] };
    const newAccount = { walletId, ...key };

    const scope = fork({
      values: [[accounts.__test.$list, testAccounts]],
      handlers: [[accounts.createAccounts, (accounts: AnyAccount) => accounts]],
    });

    await allSettled(vaultDetailsModel.events.accountsCreated, { scope, params });

    expect(scope.getState(accounts.$list)).toEqual([...testAccounts, newAccount]);
  });
});
