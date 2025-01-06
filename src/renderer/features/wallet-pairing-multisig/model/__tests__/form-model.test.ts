import { allSettled, fork } from 'effector';

import { ConnectionStatus } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import * as networkDomain from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../form-model';
import { signatoryModel } from '../signatory-model';

import {
  accounts,
  initiatorWallet,
  multisigWallet,
  signatoryWallet,
  signerWallet,
  testApi,
  testChain,
  wrongChainWallet,
} from './mock';

jest.mock('@/shared/lib/utils', () => ({
  ...jest.requireActual('@/shared/lib/utils'),
  getProxyTypes: jest.fn().mockReturnValue(['Any', 'Staking']),
}));

describe('Create multisig wallet form-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should error out for empty name', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet])
        .set(networkDomain.accounts.__test.$list, accounts),
    });

    await allSettled(formModel.$createMultisigForm.fields.name.onChange, { scope, params: '' });
    await allSettled(formModel.$createMultisigForm.submit, { scope });

    expect(scope.getState(formModel.$createMultisigForm.fields.name.$errors)[0].rule).toEqual('notEmpty');
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

    await allSettled(formModel.$createMultisigForm.fields.chainId.onChange, { scope, params: testChain.chainId });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId), walletId: '1' },
    });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signatoryWallet.accounts[0].accountId), walletId: '1' },
    });

    await allSettled(formModel.$createMultisigForm.fields.threshold.onChange, { scope, params: 2 });

    expect(scope.getState(formModel.$multisigAccountId)).toEqual(multisigWallet.accounts[0].accountId);
  });

  test('should reset $signatories and $threshold when chain changes', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet, multisigWallet])
        .set(networkDomain.accounts.__test.$list, accounts)
        .set(signatoryModel.$signatories, []),
    });

    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signatoryWallet.accounts[0].accountId), walletId: '1' },
    });

    await allSettled(formModel.$createMultisigForm.fields.threshold.onChange, { scope, params: 2 });

    await allSettled(formModel.$createMultisigForm.fields.chainId.onChange, { scope, params: testChain.chainId });

    expect(scope.getState(signatoryModel.$signatories)).toEqual([{ address: '', name: '', walletId: '' }]);
    expect(scope.getState(formModel.$createMultisigForm.fields.threshold.$value)).toEqual(0);
  });

  test('should have correct value for $availableAccounts', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet, wrongChainWallet])
        .set(networkDomain.accounts.__test.$list, accounts),
    });

    await allSettled(formModel.$createMultisigForm.fields.chainId.onChange, { scope, params: testChain.chainId });

    expect(scope.getState(formModel.$availableAccounts)).toEqual([
      ...initiatorWallet.accounts,
      ...signerWallet.accounts,
    ]);
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

    await allSettled(formModel.$createMultisigForm.fields.chainId.onChange, { scope, params: testChain.chainId });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId), walletId: '1' },
    });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signatoryWallet.accounts[0].accountId), walletId: '1' },
    });
    await allSettled(formModel.$createMultisigForm.fields.threshold.onChange, { scope, params: 2 });

    expect(scope.getState(formModel.$multisigAlreadyExists)).toEqual(true);
  });

  test('should have invalid chain addresses', async () => {
    const badAddress = '0x629C0eC6B23D0E3A2f67c2753660971faa9A1907';
    const signatories = [
      { name: 'address_1', address: '5ERebGRitMv68YJzXdzWce3rEM9XRZdunEZYtAi69rhgcoNe', walletId: '1' },
      { name: 'address_2', address: badAddress },
    ];

    const scope = fork({
      values: new Map().set(networkModel.$chains, { '0x00': testChain }).set(signatoryModel.$signatories, signatories),
    });
    await allSettled(formModel.$createMultisigForm.fields.chainId.onChange, { scope, params: testChain.chainId });

    await allSettled(signatoryModel.events.changeSignatory, { scope, params: { index: 1, ...signatories[1] } });

    expect(scope.getState(formModel.$invalidAddresses)).toEqual([badAddress]);
  });
});
