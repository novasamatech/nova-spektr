import { fork, allSettled } from 'effector';
import { hexToU8a } from '@polkadot/util';

import { manageVaultModel } from '../manage-vault-model';
import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { ChainAccount, KeyType, AccountType, CryptoType, ChainType } from '@renderer/shared/core';
import { TEST_HASH } from '@renderer/shared/lib/utils';

jest.mock('@renderer/app/providers', () => ({
  useMatrix: jest.fn(),
}));

describe('pages/Onboarding/Vault/ManageVault/model/manage-vault-model', () => {
  const defaultKeys = [
    {
      name: 'Main DOT key',
      keyType: KeyType.MAIN,
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      type: AccountType.CHAIN,
      cryptoType: CryptoType.SR25519,
      chainType: ChainType.SUBSTRATE,
      derivationPath: '//polkadot//MAIN',
    },
  ];

  const newKey = {
    name: 'My new Key',
    keyType: KeyType.PUBLIC,
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    type: AccountType.CHAIN,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    derivationPath: '//polkadot//PUBLIC',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should set default wallet name, and accounts on formInitiated', async () => {
    const scope = fork();

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
      chainType: 0,
      cryptoType: 0,
      derivationPath: '//polkadot',
      keyType: 'main',
      name: 'Main',
      type: 'chain',
    };

    expect(scope.getState(manageVaultModel.$walletForm.$values)).toEqual({ name: 'test' });
    expect(scope.getState(manageVaultModel.$keys).length).toBeGreaterThan(0);
    expect(
      scope.getState(manageVaultModel.$keys).find((account) => (account as ChainAccount).chainId === POLKADOT_CHAIN_ID),
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
