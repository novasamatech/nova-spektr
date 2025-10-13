import { allSettled, fork } from 'effector';
import { vi } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { Step, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import * as networkDomain from '@/domains/network';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { ExtrinsicResult } from '@/features/operations/OperationSubmit/lib/types';
import { type MultisigConfirm, confirmModel } from '../confirm-model';
import { flowModel } from '../flow-model';
import { formModel } from '../form-model';
import { signatoryModel } from '../signatory-model';

import { accounts, initiatorWallet, signerWallet, testApi, testChain } from './mock';

vi.mock('@/entities/transaction/lib/extrinsicService', async importOriginal => ({
  ...(await importOriginal()),
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

// TODO fix
describe.skip('Create multisig wallet flow-model', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  test('should go through the process of multisig creation', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet])
        .set(networkDomain.accounts.__test.$list, accounts),
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
    await allSettled(flowModel.signerSelected, { scope, params: signerWallet.accounts[0] });

    expect(scope.getState(flowModel.$step)).toEqual(Step.SIGNATORIES_THRESHOLD);
    await allSettled(formModel.form.fields.chainId.change, { scope, params: testChain.chainId });
    await allSettled(formModel.form.fields.name.change, { scope, params: 'some name' });
    await allSettled(formModel.form.fields.threshold.change, { scope, params: 2 });

    const mockTx = transactionBuilder.buildRemark({
      chainId: testChain.chainId,
      accountId: '0x00' as AccountId,
      threshold: 2,
      signatories: ['0x00' as AccountId],
    });

    await allSettled(formModel.form.submit, { scope });
    const account = { walletId: signerWallet.id } as unknown as networkDomain.AnyAccount;
    const store = {
      route: [account],
      tx: mockTx,
      coreTx: mockTx,
      initiator: account,
      signatory: account,
      chain: testChain,
    } satisfies MultisigConfirm;

    await allSettled(confirmModel.init, { scope, params: [store] });

    expect(scope.getState(flowModel.$step)).toEqual(Step.CONFIRM);

    await allSettled(confirmModel.startSigning, { scope });

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
            signature: '0x00',
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
