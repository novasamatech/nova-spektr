import { allSettled, fork } from 'effector';

import { toAddress } from '@/shared/lib/utils';
import * as networkDomain from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { signatoryModel } from '../signatory-model';

import { accounts, initiatorWallet, signatoryWallet, signerWallet } from './mock';

describe('Create flexible multisig wallet signatory-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should correctly add signatories', async () => {
    const scope = fork({
      values: new Map().set(signatoryModel.$signatories, []),
    });

    expect(scope.getState(signatoryModel.$signatories).length).toEqual(0);

    await allSettled(signatoryModel.events.addSignatory, {
      scope,
      params: { name: 'Alice', address: toAddress(signerWallet.accounts[0].accountId), walletId: '1' },
    });

    await allSettled(signatoryModel.events.addSignatory, {
      scope,
      params: { name: 'test', address: toAddress(signerWallet.accounts[0].accountId), walletId: '1' },
    });

    expect(scope.getState(signatoryModel.$signatories).length).toEqual(2);
  });

  test('should correctly delete signatories', async () => {
    const scope = fork({
      values: new Map().set(signatoryModel.$signatories, []),
    });

    expect(scope.getState(signatoryModel.$signatories).length).toEqual(0);

    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId), walletId: '1' },
    });

    expect(scope.getState(signatoryModel.$signatories).length).toEqual(1);

    await allSettled(signatoryModel.events.deleteSignatory, {
      scope,
      params: 0,
    });

    expect(scope.getState(signatoryModel.$signatories).length).toEqual(0);
  });

  test('should have correct value for $ownSignatoryWallets', async () => {
    const scope = fork({
      values: new Map()
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet])
        .set(networkDomain.accounts.__test.$list, accounts),
    });

    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signatoryWallet.accounts[0].accountId), walletId: '1' },
    });

    expect(scope.getState(signatoryModel.$ownedSignatoriesWallets)?.length).toEqual(0);

    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId), walletId: '1' },
    });
    expect(scope.getState(signatoryModel.$ownedSignatoriesWallets)?.length).toEqual(1);
  });
});
