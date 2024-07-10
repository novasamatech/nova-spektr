import { allSettled, fork } from 'effector';

import { networkModel } from '@entities/network';
import { walletModel } from '@entities/wallet';
import { initiatorWallet, signerWallet, testApi, testChain } from './mock';
import { Account, Chain, ConnectionStatus } from '@shared/core';
import { Step } from '../../lib/types';
import { formModel } from '../form-model';
import { flowModel } from '../flow-model';
import { confirmModel } from '../confirm-model';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { signatoryModel } from '../signatory-model';
import { toAddress } from '@shared/lib/utils';

jest.mock('@entities/transaction/lib/extrinsicService', () => ({
  ...jest.requireActual('@entities/transaction/lib/extrinsicService'),
  wrapAsMulti: jest.fn().mockResolvedValue({
    chainId: '0x00',
    address: 'mockAddress',
    type: 'multisig_as_multi',
    args: {
      threshold: 1,
      otherSignatories: ['mockSignatory1', 'mockSignatory2'],
      maybeTimepoint: null,
      callData: 'mockCallData',
      callHash: 'mockCallHash',
    },
  }),
}));

describe('widgets/CreateWallet/model/form-model', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  test('should go through the process of multisig creation', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.$wallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 0, name: 'test', address: toAddress(signerWallet.accounts[0].accountId) },
    });
    await allSettled(signatoryModel.events.signatoriesChanged, {
      scope,
      params: { index: 1, name: 'Alice', address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' },
    });

    expect(scope.getState(flowModel.$step)).toEqual(Step.NAME_NETWORK);
    await allSettled(formModel.$createMultisigForm.fields.chain.onChange, { scope, params: testChain });
    await allSettled(formModel.$createMultisigForm.fields.name.onChange, { scope, params: 'some name' });
    await allSettled(formModel.$createMultisigForm.fields.threshold.onChange, { scope, params: 2 });

    await allSettled(formModel.$createMultisigForm.submit, { scope });

    const store = {
      chain: { chainId: '0x00' } as unknown as Chain,
      account: { walletId: signerWallet.id } as unknown as Account,
      signer: { walletId: signerWallet.id } as unknown as Account,
      threshold: 2,
      name: 'multisig name',
      fee: '',
      multisigDeposit: '',
    };

    await allSettled(confirmModel.events.formInitiated, { scope, params: store });

    expect(scope.getState(flowModel.$step)).toEqual(Step.CONFIRM);

    await allSettled(confirmModel.output.formSubmitted, { scope });

    expect(scope.getState(flowModel.$step)).toEqual(Step.SIGN);

    await allSettled(signModel.output.formSubmitted, {
      scope,
      params: {
        signatures: ['0x00'],
        txPayloads: [{}] as unknown as Uint8Array[],
      },
    });

    expect(scope.getState(flowModel.$step)).toEqual(Step.SUBMIT);

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
  });
});
