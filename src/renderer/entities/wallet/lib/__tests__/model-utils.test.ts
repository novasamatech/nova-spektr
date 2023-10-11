import { modelUtils } from '../model-utils';
import { AccountType, ChainType, CryptoType, KeyType, BaseAccount, ChainAccount } from '@renderer/shared/core';
import { TEST_ACCOUNT_ID, TEST_CHAIN_ID } from '@renderer/shared/lib/utils';

jest.mock('@renderer/entities/walletConnect', () => ({
  wcModel: { events: {} },
  DEFAULT_POLKADOT_METHODS: {},
  getWalletConnectChains: jest.fn(),
}));
jest.mock('@renderer/pages/Onboarding/WalletConnect/model/wc-onboarding-model', () => ({
  wcOnboardingModel: { events: {} },
}));

const accounts = [
  {
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNT_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
  {
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNT_ID,
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.HOT,
    derivationPath: '//test/path_1',
  },
  {
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNT_ID,
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  },
  {
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNT_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
];

describe('entities/wallet/lib', () => {
  test('entities/wallet/lib/model-utils', () => {
    const { base, chains } = modelUtils.groupAccounts(accounts as (BaseAccount | ChainAccount)[]);

    expect(base).toEqual([accounts[0], accounts[3]]);
    expect(chains).toEqual([[accounts[1], accounts[2]]]);
  });
});
