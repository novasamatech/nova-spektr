import { type Event } from '@polkadot/types/interfaces';
import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { ConnectionStatus } from '@/shared/core';
import { subscriptionService } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { Step } from '../../lib/types';
import { addPureProxiedModel } from '../add-pure-proxied-model';

import { initiatorWallet, signerWallet, testApi, testChain } from './mock';

describe('widgets/AddPureProxyModal/model/add-pure-proxied-model', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should go through the process of pure proxied create', async () => {
    jest.spyOn(storageService.proxies, 'createAll').mockResolvedValue([]);
    jest.spyOn(storageService.proxyGroups, 'createAll').mockResolvedValue([]);
    jest.spyOn(storageService.proxies, 'updateAll').mockResolvedValue([]);
    jest.spyOn(storageService.proxyGroups, 'updateAll').mockResolvedValue([]);

    jest.spyOn(subscriptionService, 'subscribeEvents').mockImplementation((api, params, callback) => {
      callback({ data: [{ toHex: () => '0x01' }] } as unknown as Event);

      return Promise.resolve(() => {});
    });

    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel._test.$allWallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(addPureProxiedModel.events.flowStarted, { scope });

    expect(scope.getState(addPureProxiedModel.$chain)).toEqual(undefined);
    expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.INIT);

    // await allSettled(formModel.output.formSubmitted, {
    //   scope,
    //   params: {
    //     chain: testChain,
    //     account: { accountId: '0x00' } as unknown as Account,
    //     description: '',
    //     proxyDeposit: '1',
    //   },
    // });

    // expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.CONFIRM);

    // await allSettled(confirmModel.output.formSubmitted, { scope });

    // expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.SIGN);

    // await allSettled(signModel.output.formSubmitted, {
    //   scope,
    //   params: {
    //     signatures: ['0x00'],
    //     unsignedTxs: [{}] as unknown as UnsignedTransaction[],
    //   },
    // });

    // expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.SUBMIT);

    // const action = allSettled(submitModel.output.formSubmitted, {
    //   scope,
    //   params: {
    //     timepoint: {
    //       height: 1,
    //       index: 1,
    //     },
    //     extrinsicHash: '0x00',
    //     isFinalApprove: true,
    //     multisigError: '',
    //   },
    // });

    // await jest.runAllTimersAsync();
    // await action;

    // expect(scope.getState(addPureProxiedModel.$step)).toEqual(Step.NONE);
  });
});
