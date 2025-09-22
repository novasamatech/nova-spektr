import { allSettled, fork } from 'effector';
import { vi } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { Step, toAddress } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { flexibleMultisigFeature } from '../feature';
import { flexibleMultisigModel } from '../flexible-multisig-create';
import { signatoryModel } from '../signatory-model';

import { initiatorWallet, signerWallet, testApi, testChain } from './mock';

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

describe.skip('Create flexible multisig wallet flexible-multisig', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  test('should go through the process of multisig creation', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet]),
    });
    await allSettled(flexibleMultisigFeature.start, { scope });

    expect(scope.getState(flexibleMultisigModel.$step)).toEqual(Step.NAME_NETWORK);

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
    await allSettled(flexibleMultisigModel.signatorySelected, { scope, params: signerWallet.accounts[0] });

    expect(scope.getState(flexibleMultisigModel.$step)).toEqual(Step.NAME_NETWORK);
  });
});
