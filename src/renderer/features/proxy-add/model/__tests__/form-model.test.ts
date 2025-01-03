import { allSettled, fork } from 'effector';

import { ConnectionStatus } from '@/shared/core';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../form-model';

import { initiatorWallet, signerWallet, testApi, testChain } from './mock';

jest.mock('@/shared/lib/utils', () => ({
  ...jest.requireActual('@/shared/lib/utils'),
  getProxyTypes: jest.fn().mockReturnValue(['Any', 'Staking']),
}));

describe('widgets/AddPureProxyModal/model/form-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should fill data for form model for multisig account', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(formModel.events.formInitiated, { scope });
    await allSettled(formModel.$proxyForm.fields.chain.onChange, { scope, params: testChain });

    expect(scope.getState(formModel.$proxyForm.$values)).toEqual({
      account: {},
      chain: testChain,
      delegate: '',
      signatory: null,
      proxyType: 'Any',
    });
    expect(scope.getState(formModel.$api)).toEqual(testApi);
  });
});
