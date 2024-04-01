import { allSettled, fork } from 'effector';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Event } from '@polkadot/types/interfaces';

import { networkModel } from '@entities/network';
import { walletModel } from '@entities/wallet';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { initiatorWallet, signerWallet, testApi, testChain } from './mock';
import { Account, ConnectionStatus } from '@shared/core';
import { subscriptionService } from '@entities/chain';
import { Step } from '../../lib/types';
import { formModel } from '../form-model';
import { confirmModel } from '../confirm-model';
import { submitModel } from '../submit-model';
import { addPureProxiedModel } from '../add-pure-proxied-model';

describe('widgets/AddPureProxyModal/model/add-pure-proxied-model', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should go through the process of pure proxied create', async () => {
    jest.spyOn(subscriptionService, 'subscribeEvents').mockImplementation((api, params, callback) => {
      callback({ data: [{ toHex: () => '0x01' }] } as unknown as Event);

      return Promise.resolve(() => {});
    });

    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.$wallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(addPureProxiedModel.events.flowStarted, { scope });

    expect(scope.getState(addPureProxiedModel.$chain)).toEqual(undefined);
    expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.INIT);

    await allSettled(formModel.output.formSubmitted, {
      scope,
      params: {
        chain: testChain,
        account: { accountId: '0x00' } as unknown as Account,
        description: '',
        proxyDeposit: '1',
      },
    });

    expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.CONFIRM);

    await allSettled(confirmModel.output.formSubmitted, { scope });

    expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.SIGN);

    await allSettled(signModel.output.formSubmitted, {
      scope,
      params: {
        signature: '0x00',
        unsignedTx: {} as unknown as UnsignedTransaction,
      },
    });

    expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.SUBMIT);

    const action = allSettled(submitModel.output.formSubmitted, { scope });

    await jest.runAllTimersAsync();
    await action;

    expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.NONE);
  });
});
