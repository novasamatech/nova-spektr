import { allSettled, fork } from 'effector';

import { type Account, type ChainId, ConnectionStatus } from '@/shared/core';
import { Step, toAddress } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { ExtrinsicResult } from '@/features/operations/OperationSubmit/lib/types';
import { confirmModel } from '../confirm-model';
import { flowModel } from '../flow-model';
import { formModel } from '../form-model';
import { signatoryModel } from '../signatory-model';

import { initiatorWallet, signerWallet, testApi, testChain } from './mock';

jest.mock('@/entities/transaction/lib/extrinsicService', () => ({
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

describe('Create multisig wallet flow-model', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  test('should go through the process of multisig creation', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel._test.$allWallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: {
        index: 0,
        name: signerWallet.name,
        address: toAddress(signerWallet.accounts[0].accountId),
        walletId: '1',
      },
    });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 1, name: 'Alice', address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', walletId: '1' },
    });
    await allSettled(flowModel.events.signerSelected, { scope, params: signerWallet.accounts[0] });

    expect(scope.getState(flowModel.$step)).toEqual(Step.NAME_NETWORK);
    await allSettled(formModel.$createMultisigForm.fields.chainId.onChange, { scope, params: testChain.chainId });
    await allSettled(formModel.$createMultisigForm.fields.name.onChange, { scope, params: 'some name' });
    await allSettled(formModel.$createMultisigForm.fields.threshold.onChange, { scope, params: 2 });

    await allSettled(formModel.$createMultisigForm.submit, { scope });

    const store = {
      chainId: '0x00' as ChainId,
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
      params: [
        {
          id: 1,
          result: ExtrinsicResult.SUCCESS,
          params: {
            timepoint: {
              height: 1,
              index: 1,
            },
            extrinsicHash: '0x00',
            isFinalApprove: true,
            multisigError: '',
          },
        },
      ],
    });

    await jest.runAllTimersAsync();
    await action;
  });
});
