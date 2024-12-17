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

describe('Create flexible multisig wallet form-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should error out for empty name', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel._test.$allWallets, [initiatorWallet, signerWallet]),
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
        .set(walletModel._test.$allWallets, [initiatorWallet, signerWallet, multisigWallet])
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

  test('should have correct value for $availableAccounts', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel._test.$allWallets, [initiatorWallet, signerWallet, wrongChainWallet]),
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
        .set(walletModel._test.$allWallets, [initiatorWallet, signerWallet, multisigWallet])
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
});
