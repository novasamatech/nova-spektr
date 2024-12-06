import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type BaseAccount, ConnectionStatus, type Transaction } from '@/shared/core';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { addProxyConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { Step } from '../../lib/types';
import { addProxyModel } from '../add-proxy-model';
import { formModel } from '../form-model';

import { initiatorWallet, signerWallet, testApi, testChain } from './mock';

jest.mock('@/shared/lib/utils', () => ({
  ...jest.requireActual('@/shared/lib/utils'),
  getProxyTypes: jest.fn().mockReturnValue(['Any', 'Staking']),
}));

describe('widgets/AddProxyModal/model/add-proxy-model', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should go through the process of proxy create', async () => {
    jest.spyOn(storageService.proxies, 'createAll').mockResolvedValue([]);
    jest.spyOn(storageService.proxyGroups, 'createAll').mockResolvedValue([]);
    jest.spyOn(storageService.proxies, 'updateAll').mockResolvedValue([]);
    jest.spyOn(storageService.proxyGroups, 'updateAll').mockResolvedValue([]);

    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel._test.$allWallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(addProxyModel.events.flowStarted, { scope });

    expect(scope.getState(addProxyModel.$chain)).toEqual(undefined);
    expect(scope.getState(addProxyModel.$step)).toEqual(Step.INIT);

    await allSettled(formModel.output.formSubmitted, {
      scope,
      params: {
        transactions: {
          wrappedTx: {} as Transaction,
          coreTx: {} as Transaction,
        },
        formData: {
          chain: testChain,
          signatory: null,
          account: { accountId: '0x00' } as unknown as BaseAccount,
          delegate: '0x00',
          proxyType: 'Any',
          proxyDeposit: '1',
          proxyNumber: 1,
          fee: '1',
          multisigDeposit: '0',
        },
      },
    });

    expect(scope.getState(addProxyModel.$step)).toEqual(Step.CONFIRM);

    await allSettled(confirmModel.output.formSubmitted, { scope });

    expect(scope.getState(addProxyModel.$step)).toEqual(Step.SIGN);

    await allSettled(signModel.output.formSubmitted, {
      scope,
      params: {
        signatures: ['0x00'],
        txPayloads: [{}] as unknown as Uint8Array[],
      },
    });

    expect(scope.getState(addProxyModel.$step)).toEqual(Step.SUBMIT);

    // @ts-expect-error TODO fix
    const action = allSettled(submitModel.output.formSubmitted, {
      scope,
      params: {
        timepoint: {
          height: 1,
          index: 1,
        },
        extrinsicHash: '0x00',
        isFinalApprove: true,
        multisigError: '',
      },
    });

    await jest.runAllTimersAsync();
    await action;

    // flowFinished triggers by modal window now, not model
    expect(scope.getState(addProxyModel.$step)).toEqual(Step.SUBMIT);
  });
});
