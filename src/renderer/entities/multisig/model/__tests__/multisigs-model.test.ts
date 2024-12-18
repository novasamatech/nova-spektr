import { allSettled, fork } from 'effector';

import { AccountType, ChainOptions, ConnectionType, ExternalType, WalletType } from '@/shared/core';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { multisigService } from '../../api';
import { multisigsModel } from '../multisigs-model';

const mockChains = {
  '0x01': {
    chainId: '0x01',
    options: [ChainOptions.MULTISIG],
    externalApi: { [ExternalType.PROXY]: [{ url: 'http://mock-url' }] },
  },
};

const mockConnections = {
  '0x01': {
    chainId: '0x01',
    connectionType: ConnectionType.AUTO_BALANCE,
  },
};

describe('multisigs model', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
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

  test('should add multisig for Nova Wallet', async () => {
    const spySaveMultisig = jest.fn();

    const scope = fork({
      values: new Map()
        .set(walletModel._test.$allWallets, [
          {
            id: 1,
            type: WalletType.NOVA_WALLET,
            accounts: [{ walletId: 1, accountId: '0x03', type: AccountType.WALLET_CONNECT, chainId: '0x01' }],
          },
        ])
        .set(networkModel.$chains, mockChains)
        .set(networkModel.$connections, mockConnections),
      handlers: new Map().set(walletModel._test.walletCreatedFx, spySaveMultisig),
    });

    allSettled(multisigsModel.events.subscribe, { scope });
    await jest.runOnlyPendingTimersAsync();

    expect(spySaveMultisig).toHaveBeenCalled();
  });

  test('should not add multisig we already have', async () => {
    const spySaveMultisig = jest.fn();

    const scope = fork({
      values: new Map()
        .set(walletModel._test.$allWallets, [
          {
            id: 1,
            type: WalletType.NOVA_WALLET,
            accounts: [{ walletId: 1, accountId: '0x03', type: AccountType.WALLET_CONNECT, chainId: '0x01' }],
          },
          {
            id: 2,
            type: WalletType.MULTISIG,
            accounts: [{ walletId: 2, accountId: '0x00', type: AccountType.MULTISIG, chainId: '0x01' }],
          },
        ])
        .set(networkModel.$chains, mockChains)
        .set(networkModel.$connections, mockConnections),
      handlers: new Map().set(walletModel._test.walletCreatedFx, spySaveMultisig),
    });

    allSettled(multisigsModel.events.subscribe, { scope });
    await jest.runOnlyPendingTimersAsync();

    expect(spySaveMultisig).not.toHaveBeenCalled();
  });
});
