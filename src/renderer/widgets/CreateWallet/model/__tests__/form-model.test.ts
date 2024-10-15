import { allSettled, fork } from 'effector';

import { ConnectionStatus } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../form-model';
import { signatoryModel } from '../signatory-model';

import {
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

describe('widgets/CreateWallet/model/form-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should error out for empty name', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.$wallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(formModel.$createMultisigForm.fields.name.onChange, { scope, params: '' });
    await allSettled(formModel.$createMultisigForm.submit, { scope });

    expect(scope.getState(formModel.$createMultisigForm.fields.name.$errors)[0].rule).toEqual('notEmpty');
  });

  test('should error out for low threshold', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.$wallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(formModel.$createMultisigForm.fields.threshold.onChange, { scope, params: 1 });
    await allSettled(formModel.$createMultisigForm.submit, { scope });

    expect(scope.getState(formModel.$createMultisigForm.fields.threshold.$errors)[0].rule).toEqual('moreOrEqualToTwo');
  });

  test('should have correct value for $multisigAccountId', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.$wallets, [initiatorWallet, signerWallet, multisigWallet])
        .set(signatoryModel.$signatories, new Map([])),
    });

    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId) },
    });
    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signatoryWallet.accounts[0].accountId) },
    });

    await allSettled(formModel.$createMultisigForm.fields.threshold.onChange, { scope, params: 2 });
    await allSettled(formModel.$createMultisigForm.fields.chain.onChange, { scope, params: testChain });

    expect(scope.getState(formModel.$multisigAccountId)).toEqual(multisigWallet.accounts[0].accountId);
  });

  test('should have correct value for $availableAccounts', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.$wallets, [initiatorWallet, signerWallet, wrongChainWallet]),
    });

    await allSettled(formModel.$createMultisigForm.fields.chain.onChange, { scope, params: testChain });

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
        .set(walletModel.$wallets, [initiatorWallet, signerWallet, multisigWallet])
        .set(signatoryModel.$signatories, new Map([])),
    });

    await allSettled(formModel.$createMultisigForm.fields.chain.onChange, { scope, params: testChain });
    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId) },
    });
    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 1, name: 'Alice', address: toAddress(signatoryWallet.accounts[0].accountId) },
    });
    await allSettled(formModel.$createMultisigForm.fields.threshold.onChange, { scope, params: 2 });

    expect(scope.getState(formModel.$multisigAlreadyExists)).toEqual(true);
  });
});
