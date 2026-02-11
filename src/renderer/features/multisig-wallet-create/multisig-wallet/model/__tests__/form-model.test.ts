import { allSettled, fork } from 'effector';

import { ConnectionStatus } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import * as networkDomain from '@/domains/network';
import { accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../form-model';
import { signatoryModel } from '../signatory-model';

import { accounts, initiatorWallet, multisigWallet, signatoryWallet, signerWallet, testApi, testChain } from './mock';

describe('Create multisig wallet form-model', () => {
  beforeEach(() => {
    // @ts-expect-error unknown error
    accountService.accountAvailabilityOnChainAnyOf.registerHandler();
    jest.restoreAllMocks();
  });

  test('should have correct value for $multisigAccountId', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet, multisigWallet])
        .set(networkDomain.accounts.__test.$list, accounts)
        .set(signatoryModel.$signatories, []),
    });

    await allSettled(formModel.form.fields.chainId.change, { scope, params: testChain.chainId });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0]!.accountId), walletId: '1' },
    });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signatoryWallet.accounts[0]!.accountId), walletId: '1' },
    });

    await allSettled(formModel.form.fields.threshold.change, { scope, params: 2 });

    expect(scope.getState(formModel.$multisigAccountId)).toEqual(multisigWallet.accounts[0]!.accountId);
  });

  test('should have correct value for $multisigAlreadyExists', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet, multisigWallet])
        .set(networkDomain.accounts.__test.$list, accounts)
        .set(signatoryModel.$signatories, []),
    });

    await allSettled(formModel.form.fields.chainId.change, { scope, params: testChain.chainId });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0]!.accountId), walletId: '1' },
    });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signatoryWallet.accounts[0]!.accountId), walletId: '1' },
    });
    await allSettled(formModel.form.fields.threshold.change, { scope, params: 2 });

    expect(scope.getState(formModel.$multisigAlreadyExists)).toEqual(true);
  });

  test('should have invalid chain addresses', async () => {
    const badAddress = 'test';
    const signatories = [
      { name: 'address_1', address: '5ERebGRitMv68YJzXdzWce3rEM9XRZdunEZYtAi69rhgcoNe', walletId: '1' },
      { name: 'address_2', address: badAddress },
    ];

    const scope = fork({
      values: new Map().set(networkModel.$chains, { '0x00': testChain }).set(signatoryModel.$signatories, signatories),
    });
    await allSettled(formModel.form.fields.chainId.change, { scope, params: testChain.chainId });

    await allSettled(signatoryModel.events.changeSignatory, { scope, params: { index: 1, ...signatories[1]! } });

    expect(scope.getState(formModel.$invalidAddresses)).toEqual([badAddress]);
  });
});
