import { hexToU8a } from '@polkadot/util';
import { allSettled, fork } from 'effector';

import {
  type VaultChainAccount,
  type Wallet,
  AccountNameType,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { TEST_HASH } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { type SeedInfo } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { pairingFormModel } from '../../../../model/pairing-form-model';
import { manageVaultModel } from '../manage-vault-model';

const ROOT = '0x01' as AccountId;

const vaultWallet = {
  id: 7,
  name: 'My Vault',
  type: WalletType.POLKADOT_VAULT,
  rootAccountId: ROOT,
  isActive: false,
} as unknown as Omit<Wallet, 'accounts'>;

const vaultCreateParams = {
  wallet: { name: 'Vault', rootAccountId: ROOT, type: WalletType.POLKADOT_VAULT },
  accounts: [],
} as unknown as Parameters<typeof manageVaultModel.events.vaultCreated>[0];

describe('pages/Onboarding/Vault/ManageVault/model/manage-vault-model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should set default wallet name, and accounts on formInitiated', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, {
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': {
          name: 'Polkadot',
          specName: 'polkadot',
          chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
          addressPrefix: 0,
        },
        '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe': {
          name: 'Kusama',
          specName: 'kusama',
          chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
          addressPrefix: 2,
        },
        '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c': {
          name: 'Acala',
          specName: 'acala',
          chainId: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
          addressPrefix: 10,
        },
        '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e': {
          name: 'Westend',
          specName: 'westend',
          chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
          addressPrefix: 42,
        },
      }),
    });

    await allSettled(manageVaultModel.events.formInitiated, {
      scope,
      params: {
        name: 'test',
        derivedKeys: [],
        multiSigner: {
          MultiSigner: 'SR25519',
          public: hexToU8a(TEST_HASH),
        },
      } as SeedInfo,
    });

    const POLKADOT_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
    const MAIN_POLKAODT_ACCOUNT = {
      chainId: POLKADOT_CHAIN_ID,
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      derivationPath: '//polkadot',
      keyType: 'main',
      name: 'Main',
      nameType: AccountNameType.GENERATED,
      accountType: 'chain',
      type: 'chain',
      createdAt: expect.any(Number),
    };

    expect(scope.getState(manageVaultModel.$walletForm.$values)).toEqual({ name: 'test' });
    expect(scope.getState(manageVaultModel.$keys).length).toEqual(3); // Polkadot, Kusama, Westend
    expect(
      scope
        .getState(manageVaultModel.$keys)
        .find(account => (account as VaultChainAccount).chainId === POLKADOT_CHAIN_ID),
    ).toEqual(MAIN_POLKAODT_ACCOUNT);
  });

  test('does not create a wallet when the scanned key belongs to an existing vault', async () => {
    const createWallet = vi.fn();
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [vaultWallet]).set(accounts.__test.$list, []),
      handlers: new Map<any, any>([[walletModel.createWallet, createWallet]]),
    });

    await allSettled(pairingFormModel.seedScanned, { scope, params: ROOT });
    await allSettled(manageVaultModel.events.vaultCreated, { scope, params: vaultCreateParams });

    expect(createWallet).not.toHaveBeenCalled();
  });

  test('creates a wallet when the scanned key is new', async () => {
    const createWallet = vi.fn().mockResolvedValue(undefined);
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [vaultWallet]).set(accounts.__test.$list, []),
      handlers: new Map<any, any>([[walletModel.createWallet, createWallet]]),
    });

    await allSettled(pairingFormModel.seedScanned, { scope, params: '0x02' as AccountId });
    await allSettled(manageVaultModel.events.vaultCreated, { scope, params: vaultCreateParams });

    expect(createWallet).toHaveBeenCalledWith(vaultCreateParams);
  });
});
