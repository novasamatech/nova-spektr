import { allSettled, fork } from 'effector';
import { vi } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../form-model';

import { initiatorWallet, signerWallet, testApi, testChain } from './mock';

vi.mock('@/shared/lib/utils', async () => ({
  ...(await vi.importActual('@/shared/lib/utils')),
  getProxyTypes: () => ['Any'],
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

    await allSettled(formModel.formInitiated, { scope });
    await allSettled(formModel.form.fields.chain.change, { scope, params: testChain });

    expect(scope.getState(formModel.form.$values)).toEqual({
      initiator: null,
      chain: testChain,
      delegate: '',
      signatory: null,
      proxyType: 'Any',
    });
    expect(scope.getState(formModel.$api)).toEqual(testApi);
  });
});
