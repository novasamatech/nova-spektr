import { allSettled, fork } from 'effector';

import { CryptoType, SigningType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';

import { accountsDomainModel } from './model';
import { type AnyAccount, type AnyAccountDraft } from './types';

const accounts: AnyAccount[] = [
  {
    id: 'test',
    type: 'chain',
    accountId: createAccountId('1'),
    chainId: '0x01',
    name: '',
    walletId: 0,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
  },
  {
    id: 'test 2',
    type: 'universal',
    accountId: createAccountId('2'),
    name: '',
    walletId: 0,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
  },
];

describe('accounts model', () => {
  it('should populate accounts', async () => {
    const scope = fork({
      handlers: [[accountsDomainModel.populate, () => accounts]],
    });

    expect(scope.getState(accountsDomainModel.$populated)).toEqual(false);

    await allSettled(accountsDomainModel.populate, { scope });

    expect(scope.getState(accountsDomainModel.$list)).toEqual(accounts);
    expect(scope.getState(accountsDomainModel.$populated)).toEqual(true);
  });

  it('should create new accounts', async () => {
    const scope = fork({
      handlers: [[accountsDomainModel.createAccounts, (accounts: AnyAccount[]) => accounts]],
    });

    await allSettled(accountsDomainModel.createAccounts, { scope, params: accounts });

    expect(scope.getState(accountsDomainModel.$list)).toEqual(accounts);
  });

  it('should successfully update account', async () => {
    const scope = fork({
      values: [[accountsDomainModel.__test.$list, accounts]],
      handlers: [[accountsDomainModel.__test.updateAccountFx, () => true]],
    });

    const draft: AnyAccountDraft = {
      accountId: createAccountId('1'),
      chainId: '0x01',
      walletId: 0,
      type: 'chain',
      name: 'test',
    };

    await allSettled(accountsDomainModel.updateAccount, {
      scope,
      params: draft,
    });

    expect(scope.getState(accountsDomainModel.$list)).toEqual([{ ...accounts[0], ...draft }, accounts[1]]);
  });

  it('should skip update if account is not defined', async () => {
    const scope = fork({
      values: [[accountsDomainModel.__test.$list, accounts]],
      handlers: [[accountsDomainModel.__test.updateAccountFx, () => false]],
    });

    const draft: AnyAccountDraft = {
      accountId: createAccountId('3'),
      chainId: '0x01',
      walletId: 0,
      type: 'chain',
      name: 'test',
    };

    await allSettled(accountsDomainModel.updateAccount, {
      scope,
      params: draft,
    });

    expect(scope.getState(accountsDomainModel.$list)).toEqual(accounts);
  });

  it('should create delete accounts', async () => {
    const scope = fork({
      handlers: [
        [accountsDomainModel.populate, () => accounts],
        [accountsDomainModel.deleteAccounts, (accounts: AnyAccount[]) => accounts],
      ],
    });

    await allSettled(accountsDomainModel.populate, { scope });
    await allSettled(accountsDomainModel.deleteAccounts, { scope, params: accounts.slice(0, 1) });

    expect(scope.getState(accountsDomainModel.$list)).toEqual(accounts.slice(1, 2));
  });
});
