import { allSettled, fork } from 'effector';

import { toAddress } from '@/shared/lib/utils';
import { walletModel } from '@/entities/wallet';
import { signatoryModel } from '../signatory-model';

import { initiatorWallet, signatoryWallet, signerWallet } from './mock';

describe('widgets/CreateWallet/model/signatory-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should correctly add signatories', async () => {
    const scope = fork({
      values: new Map().set(signatoryModel.$signatories, new Map([])),
    });

    expect(scope.getState(signatoryModel.$signatories).size).toEqual(0);

    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signerWallet.accounts[0].accountId) },
    });

    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId) },
    });

    expect(scope.getState(signatoryModel.$signatories).size).toEqual(2);
  });

  test('should correctly delete signatories', async () => {
    const scope = fork({
      values: new Map().set(signatoryModel.$signatories, new Map([])),
    });

    expect(scope.getState(signatoryModel.$signatories).size).toEqual(0);

    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId) },
    });

    expect(scope.getState(signatoryModel.$signatories).size).toEqual(1);

    await allSettled(signatoryModel.events.signatoryDeleted, {
      scope,
      params: 0,
    });

    expect(scope.getState(signatoryModel.$signatories).size).toEqual(0);
  });

  test('should have correct value for $ownSignatoryWallets', async () => {
    const scope = fork({
      values: new Map().set(walletModel.$wallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signatoryWallet.accounts[0].accountId) },
    });

    expect(scope.getState(signatoryModel.$ownedSignatoriesWallets)?.length).toEqual(0);

    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId) },
    });
    expect(scope.getState(signatoryModel.$ownedSignatoriesWallets)?.length).toEqual(1);
  });
});
