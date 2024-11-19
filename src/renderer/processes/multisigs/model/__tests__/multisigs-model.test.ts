import { allSettled, fork } from 'effector';

import { AccountType, ChainOptions, ConnectionType } from '@/shared/core';
import { multisigService } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { multisigsModel } from '../multisigs-model';

describe('features/multisigs/model/multisigs-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(multisigService, 'filterMultisigsAccounts').mockResolvedValue([
      {
        accountId: '0x00',
        threshold: 2,
        signatories: ['0x01', '0x02', '0x03'],
      },
    ]);
  });

  test('should not create a multisig we already have', async () => {
    const multisigCreation = jest.spyOn(walletModel.events, 'multisigCreated');

    const scope = fork({
      values: new Map()
        .set(walletModel._test.$allWallets, [
          { id: 1111, accounts: [{ walletId: 1111, accountId: '0x00', type: AccountType.CHAIN, chainId: '0x01' }] },
        ])
        .set(networkModel.$chains, {
          '0x01': {
            chainId: '0x01',
            name: 'Westend',
            options: [ChainOptions.MULTISIG],
            externalApi: { multisig: [{ url: 'http://mock-url' }] },
          },
        }),
    });

    await allSettled(networkModel.$connections, {
      scope,
      params: {
        '0x01': {
          id: 1,
          chainId: '0x01',
          connectionType: ConnectionType.AUTO_BALANCE,
          customNodes: [],
        },
      },
    });
    allSettled(multisigsModel.events.multisigsDiscoveryStarted, { scope });

    expect(multisigCreation).not.toHaveBeenCalled();
  });
});
