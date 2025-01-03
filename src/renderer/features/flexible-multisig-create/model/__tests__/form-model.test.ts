import { allSettled, fork } from 'effector';

import { ConnectionStatus } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { polkadotChain } from '@/shared/mocks';
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
        .set(networkModel.$apis, { [polkadotChain.chainId]: testApi })
        .set(networkModel.$chains, { [polkadotChain.chainId]: polkadotChain })
        .set(networkModel.$connectionStatuses, { [polkadotChain.chainId]: ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(formModel.$createMultisigForm.fields.name.onChange, { scope, params: '' });
    await allSettled(formModel.$createMultisigForm.submit, { scope });

    expect(scope.getState(formModel.$createMultisigForm.fields.name.$errors)[0].rule).toEqual('notEmpty');
  });

  test('should have correct value for $multisigAccountId', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { [polkadotChain.chainId]: testApi })
        .set(networkModel.$chains, { [polkadotChain.chainId]: polkadotChain })
        .set(networkModel.$connectionStatuses, { [polkadotChain.chainId]: ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet, multisigWallet])
        .set(networkDomain.accounts.__test.$list, accounts)
        .set(signatoryModel.$signatories, []),
    });

    await allSettled(formModel.$createMultisigForm.fields.chainId.onChange, { scope, params: polkadotChain.chainId });
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
        .set(networkModel.$apis, { [polkadotChain.chainId]: testApi })
        .set(networkModel.$chains, { [polkadotChain.chainId]: polkadotChain })
        .set(networkModel.$connectionStatuses, { [polkadotChain.chainId]: ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet, wrongChainWallet])
        .set(networkDomain.accounts.__test.$list, [
          ...initiatorWallet.accounts,
          ...signerWallet.accounts,
          ...wrongChainWallet.accounts,
        ]),
    });

    await allSettled(formModel.$createMultisigForm.fields.chainId.onChange, { scope, params: polkadotChain.chainId });

    expect(scope.getState(formModel.$availableAccounts)).toEqual([
      ...initiatorWallet.accounts,
      ...signerWallet.accounts,
    ]);
  });

  test('should have correct value for $multisigAlreadyExists', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { [polkadotChain.chainId]: testApi })
        .set(networkModel.$chains, { [polkadotChain.chainId]: polkadotChain })
        .set(networkModel.$connectionStatuses, { [polkadotChain.chainId]: ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet, multisigWallet])
        .set(networkDomain.accounts.__test.$list, accounts)
        .set(signatoryModel.$signatories, []),
    });

    await allSettled(formModel.$createMultisigForm.fields.chainId.onChange, { scope, params: polkadotChain.chainId });
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
