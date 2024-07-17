import { allSettled, fork } from 'effector';

import {
  AccountType,
  ChainOptions,
  ChainType,
  ConnectionType,
  CryptoType,
  SigningType,
  WalletType,
} from '@shared/core';

import { multisigService } from '@entities/multisig';
import { networkModel } from '@entities/network';
import { walletModel } from '@entities/wallet';

import { multisigsModel } from '../multisigs-model';

const signatories = [
  {
    accountId: '0x01',
    address: 'F7NZ',
  },
  {
    accountId: '0x02',
    address: 'F7Pa',
  },
  {
    accountId: '0x03',
    address: 'F7XB',
  },
];

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

  test('should create multisigs', async () => {
    const multisigCreation = jest.spyOn(walletModel.events, 'multisigCreated');

    const newMultisig = {
      wallet: {
        name: 'F7Hs',
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [
        {
          threshold: 2,
          accountId: '0x00',
          signatories: signatories.map(({ accountId, address }) => ({
            accountId,
            address,
          })),
          name: 'F7Hs',
          chainId: '0x01',
          cryptoType: CryptoType.SR25519,
          chainType: ChainType.SUBSTRATE,
          type: AccountType.MULTISIG,
        },
      ],
    };
    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [
          { id: 1111, accounts: [{ walletId: 1111, accountId: '0x11', type: AccountType.CHAIN, chainId: '0x01' }] },
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

    expect(multisigCreation).toHaveBeenCalledWith(newMultisig);
  });

  test('should not create a multisig we already have', async () => {
    const multisigCreation = jest.spyOn(walletModel.events, 'multisigCreated');

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [
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
