import {
  AssetType,
  type Balance,
  type Chain,
  ChainOptions,
  ChainType,
  CryptoType,
  SigningType,
  StakingType,
  TransactionType,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { polkadotChain as basePolkadotChain, createAccountId } from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';

/**
 * Test fixtures for transfer feature integration tests Provides pre-configured
 * wallets, accounts, chains, and balances for different transfer scenarios.
 */

// Chain IDs
export const polkadotChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
export const kusamaChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
export const assetHubChainId = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f';
export const bifrostChainId = '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b';

// Chains
export const polkadotChain: Chain = {
  ...basePolkadotChain,
  chainId: polkadotChainId,
};

export const kusamaChain: Chain = {
  name: 'Kusama',
  specName: 'kusama',
  chainId: kusamaChainId,
  parentId: null,
  assets: [
    {
      assetId: 0,
      symbol: 'KSM',
      name: 'Kusama',
      precision: 12,
      type: AssetType.NATIVE,
      priceId: 'kusama',
      staking: StakingType.RELAYCHAIN,
      icon: {
        monochrome: 'https://example.com/ksm-mono.svg',
        colored: 'https://example.com/ksm-color.svg',
      },
    },
  ],
  nodes: [],
  addressPrefix: 2,
  externalApi: null,
  explorers: [],
  icon: 'https://example.com/kusama.svg',
  options: [ChainOptions.MULTISIG, ChainOptions.PROXY],
  chainType: ChainType.SUBSTRATE,
};

export const assetHubChain: Chain = {
  name: 'Asset Hub',
  specName: 'statemint',
  chainId: assetHubChainId,
  parentId: polkadotChainId,
  assets: [
    {
      assetId: 0,
      symbol: 'DOT',
      name: 'Polkadot',
      precision: 10,
      type: AssetType.NATIVE,
      priceId: 'polkadot',
      staking: StakingType.RELAYCHAIN,
      icon: {
        monochrome: 'https://example.com/dot-mono.svg',
        colored: 'https://example.com/dot-color.svg',
      },
    },
    {
      assetId: 1337,
      symbol: 'USDT',
      name: 'Tether USD',
      precision: 6,
      type: AssetType.STATEMINE,
      priceId: 'tether',
      staking: StakingType.NONE,
      icon: {
        monochrome: 'https://example.com/usdt-mono.svg',
        colored: 'https://example.com/usdt-color.svg',
      },
      typeExtras: {
        assetId: '1337',
      },
    },
  ],
  nodes: [],
  addressPrefix: 0,
  externalApi: null,
  explorers: [],
  icon: 'https://example.com/assethub.svg',
  options: [ChainOptions.MULTISIG],
  chainType: ChainType.SUBSTRATE,
};

export const bifrostChain: Chain = {
  name: 'Bifrost Polkadot',
  specName: 'bifrost',
  chainId: bifrostChainId,
  parentId: polkadotChainId,
  assets: [
    {
      assetId: 0,
      symbol: 'BNC',
      name: 'Bifrost',
      precision: 12,
      type: AssetType.NATIVE,
      priceId: 'bifrost-native-coin',
      staking: StakingType.NONE,
      icon: {
        monochrome: 'https://example.com/bnc-mono.svg',
        colored: 'https://example.com/bnc-color.svg',
      },
    },
  ],
  nodes: [],
  addressPrefix: 6,
  externalApi: null,
  explorers: [],
  icon: 'https://example.com/bifrost.svg',
  options: [ChainOptions.MULTISIG],
  chainType: ChainType.SUBSTRATE,
};

// Wallets
export const vaultWallet: Wallet = {
  id: 1,
  name: 'Vault Wallet',
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
};

export const multisigWallet: Wallet = {
  id: 2,
  name: 'Multisig Wallet',
  type: WalletType.MULTISIG,
  signingType: SigningType.MULTISIG,
};

export const watchOnlyWallet: Wallet = {
  id: 3,
  name: 'Watch Only Wallet',
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
};

export const proxiedWallet: Wallet = {
  id: 4,
  name: 'Proxied Wallet',
  type: WalletType.PROXIED,
  signingType: SigningType.POLKADOT_VAULT,
};

// Accounts
export const senderAccount: AnyAccount = {
  id: 'sender-1',
  accountId: createAccountId(1),
  walletId: vaultWallet.id,
  name: 'Sender Account',
  type: 'base',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
};

export const recipientAccount: AnyAccount = {
  id: 'recipient-1',
  accountId: createAccountId(2),
  walletId: watchOnlyWallet.id,
  name: 'Recipient Account',
  type: 'base',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WATCH_ONLY,
};

export const multisigAccount: AnyAccount = {
  id: 'multisig-1',
  accountId: createAccountId(10),
  walletId: multisigWallet.id,
  name: 'Multisig Account',
  type: 'multisig',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 2,
  signatories: [
    {
      accountId: createAccountId(11),
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      name: 'Signatory 1',
    },
    {
      accountId: createAccountId(12),
      address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      name: 'Signatory 2',
    },
    {
      accountId: createAccountId(13),
      address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
      name: 'Signatory 3',
    },
  ],
};

export const signatoryAccount: AnyAccount = {
  id: 'signatory-1',
  accountId: createAccountId(11),
  walletId: vaultWallet.id,
  name: 'Signatory 1',
  type: 'base',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
};

export const proxiedAccount: AnyAccount = {
  id: 'proxied-1',
  accountId: createAccountId(20),
  walletId: proxiedWallet.id,
  name: 'Proxied Account',
  type: 'proxied',
  chainId: polkadotChainId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  proxyVariant: 'regular',
  connections: [
    {
      proxyAccountId: createAccountId(21),
      delay: 0,
      proxyType: 'Any',
    },
  ],
  deposit: '100000000000',
  blockNumber: 12345,
  extrinsicIndex: 0,
};

export const proxyAccount: AnyAccount = {
  id: 'proxy-1',
  accountId: createAccountId(21),
  walletId: vaultWallet.id,
  name: 'Proxy Account',
  type: 'base',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
};

// Balances
export const senderBalance: Balance = {
  id: `${senderAccount.accountId}-${polkadotChainId}-${0}`,
  accountId: senderAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0,
  total: '10000000000000', // 1000 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

export const senderLowBalance: Balance = {
  ...senderBalance,
  total: '20000000000', // 2 DOT (barely enough for fees)
};

export const senderAssetHubBalance: Balance = {
  id: `${senderAccount.accountId}-${assetHubChainId}-${0}`,
  accountId: senderAccount.accountId,
  chainId: assetHubChainId,
  assetId: 0,
  total: '5000000000', // 500 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

export const senderUsdtBalance: Balance = {
  id: `${senderAccount.accountId}-${assetHubChainId}-${1337}`,
  accountId: senderAccount.accountId,
  chainId: assetHubChainId,
  assetId: 1337,
  total: '1000000000', // 1000 USDT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

export const multisigBalance: Balance = {
  id: `${multisigAccount.accountId}-${polkadotChainId}-${0}`,
  accountId: multisigAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0,
  total: '50000000000000', // 5000 DOT
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

export const signatoryBalance: Balance = {
  id: `${signatoryAccount.accountId}-${polkadotChainId}-${0}`,
  accountId: signatoryAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0,
  total: '2000000000000', // 200 DOT (for fees)
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

export const proxyBalance: Balance = {
  id: `${proxyAccount.accountId}-${polkadotChainId}-${0}`,
  accountId: proxyAccount.accountId,
  chainId: polkadotChainId,
  assetId: 0,
  total: '1000000000000', // 100 DOT (for fees)
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};

// Transaction templates
export const nativeTransferTx = {
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  type: TransactionType.TRANSFER,
  args: {
    dest: recipientAccount.accountId,
    value: '1000000000000', // 100 DOT
  },
};

export const assetTransferTx = {
  chainId: assetHubChainId,
  accountId: senderAccount.accountId,
  type: TransactionType.ASSET_TRANSFER,
  args: {
    asset: 1337,
    dest: recipientAccount.accountId,
    value: '100000000', // 100 USDT
  },
};

export const xcmTransferTx = {
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  type: TransactionType.XCM_LIMITED_TRANSFER,
  args: {
    dest: recipientAccount.accountId,
    destinationChain: assetHubChainId,
    asset: 0,
    value: '500000000000', // 50 DOT
    xcmFee: '5000000000', // 0.5 DOT
  },
};

export const multisigTransferTx = {
  chainId: polkadotChainId,
  accountId: multisigAccount.accountId,
  type: TransactionType.MULTISIG_AS_MULTI,
  args: {
    threshold: 2,
    otherSignatories: [createAccountId(12), createAccountId(13)],
    maybeTimepoint: null,
    callData: '0x0600...',
    callHash: '0x1234...',
  },
};

/**
 * Helper function to create a balance for testing
 */
export function createBalance(accountId: string, chainId: string, assetId: number, total: string): Balance {
  return {
    id: `${accountId}-${chainId}-${assetId}`,
    accountId,
    chainId,
    assetId,
    total,
    frozen: '0',
    reserved: '0',
    transferable: 'legacy',
  };
}

/**
 * Helper to create a transfer transaction
 */
export function createTransferTx(
  from: AnyAccount,
  to: AnyAccount,
  chainId: string,
  amount: string,
  type: TransactionType = TransactionType.TRANSFER,
) {
  return {
    chainId,
    accountId: from.accountId,
    type,
    args: {
      dest: to.accountId,
      value: amount,
    },
  };
}
