import { hexToU8a } from '@polkadot/util';
import { allSettled, fork } from 'effector';

import { AccountType, CryptoType, KeyType, SigningType, type VaultChainAccount } from '@/shared/core';
import { TEST_HASH } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { type SeedInfo } from '@/entities/transaction';
import { manageVaultModel } from '../manage-vault-model';

describe('pages/Onboarding/Vault/ManageVault/model/manage-vault-model', () => {
  const defaultKeys = [
    {
      type: 'chain',
      name: 'Main DOT key',
      keyType: KeyType.MAIN,
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      accountType: AccountType.CHAIN,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.POLKADOT_VAULT,
      derivationPath: '//polkadot//MAIN',
    },
  ];

  const newKey = {
    name: 'My new Key',
    keyType: KeyType.PUBLIC,
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    type: 'chain',
    accountType: AccountType.CHAIN,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    derivationPath: '//polkadot//PUBLIC',
  };

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
      params: [
        {
          name: 'test',
          multiSigner: {
            MultiSigner: 'SR25519',
            public: hexToU8a(TEST_HASH),
          },
          derivedKeys: [],
          features: [],
        } as SeedInfo,
      ],
    });

    const POLKADOT_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
    const MAIN_POLKAODT_ACCOUNT = {
      chainId: POLKADOT_CHAIN_ID,
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      derivationPath: '//polkadot',
      keyType: 'main',
      name: 'Main',
      accountType: 'chain',
      type: 'chain',
    };

    expect(scope.getState(manageVaultModel.$walletForm.$values)).toEqual({ name: 'test' });
    expect(scope.getState(manageVaultModel.$keys).length).toEqual(3); // Polkadot, Kusama, Westend
    expect(
      scope
        .getState(manageVaultModel.$keys)
        .find((account) => (account as VaultChainAccount).chainId === POLKADOT_CHAIN_ID),
    ).toEqual(MAIN_POLKAODT_ACCOUNT);
  });

  test('should add new keys', async () => {
    const scope = fork({
      values: new Map().set(manageVaultModel.$keys, defaultKeys),
    });

    await allSettled(manageVaultModel.events.keysAdded, { scope, params: [newKey] });

    expect(scope.getState(manageVaultModel.$keys)).toEqual([defaultKeys[0], newKey]);
  });

  test('should remove keys', async () => {
    const scope = fork({
      values: new Map().set(manageVaultModel.$keys, defaultKeys),
    });

    await allSettled(manageVaultModel.events.keysRemoved, { scope, params: defaultKeys });

    expect(scope.getState(manageVaultModel.$keys)).toEqual([]);
  });
});
