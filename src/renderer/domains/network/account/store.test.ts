import { allSettled, fork } from 'effector';

import { CryptoType, SigningType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';

import { accounts } from './store';
import { type AnyAccount, type AnyAccountDraft } from './types';

const testAccounts: AnyAccount[] = [
  {
    id: 'test',
    type: 'chain',
    accountId: createAccountId('1'),
    chainId: '0x01',
    name: '',
    walletId: 0,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    createdAt: Date.now(),
  },
  {
    id: 'test 2',
    type: 'universal',
    accountId: createAccountId('2'),
    name: '',
    walletId: 0,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    createdAt: Date.now(),
  },
];

describe('accounts store', () => {
  it('should populate accounts', async () => {
    const scope = fork({
      handlers: [[accounts.populate, () => testAccounts]],
    });

    expect(scope.getState(accounts.$populated)).toEqual(false);

    await allSettled(accounts.populate, { scope });

    expect(scope.getState(accounts.$list)).toEqual(testAccounts);
    expect(scope.getState(accounts.$populated)).toEqual(true);
  });

  it('should create new accounts', async () => {
    const scope = fork({
      handlers: [[accounts.createAccounts, (accounts: AnyAccount[]) => accounts]],
    });

    await allSettled(accounts.createAccounts, { scope, params: testAccounts });

    expect(scope.getState(accounts.$list)).toEqual(testAccounts);
  });

  it('should successfully update account', async () => {
    const scope = fork({
      values: [[accounts.__test.$list, testAccounts]],
      handlers: [[accounts.updateAccount, () => true]],
    });

    const draft: AnyAccountDraft = {
      accountId: createAccountId('1'),
      chainId: '0x01',
      walletId: 0,
      type: 'chain',
      name: 'test',
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      createdAt: Date.now(),
    };

    await allSettled(accounts.updateAccount, {
      scope,
      params: draft,
    });

    expect(scope.getState(accounts.$list)).toEqual([{ ...testAccounts[0], ...draft }, testAccounts[1]]);
  });

  it('should skip update if account is not defined', async () => {
    const scope = fork({
      values: [[accounts.__test.$list, testAccounts]],
      handlers: [[accounts.updateAccounts, () => false]],
    });

    const draft: AnyAccountDraft = {
      accountId: createAccountId('3'),
      chainId: '0x01',
      walletId: 0,
      type: 'chain',
      name: 'test',
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      createdAt: Date.now(),
    };

    await allSettled(accounts.updateAccount, {
      scope,
      params: draft,
    });

    expect(scope.getState(accounts.$list)).toEqual(testAccounts);
  });

  it('should create delete accounts', async () => {
    const scope = fork({
      handlers: [
        [accounts.populate, () => testAccounts],
        [accounts.deleteAccounts, (accounts: AnyAccount[]) => accounts],
      ],
    });

    await allSettled(accounts.populate, { scope });
    await allSettled(accounts.deleteAccounts, { scope, params: testAccounts.slice(0, 1) });

    expect(scope.getState(accounts.$list)).toEqual(testAccounts.slice(1, 2));
  });
});
