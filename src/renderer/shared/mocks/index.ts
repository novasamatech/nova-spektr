import { createTestKeyring } from '@polkadot/keyring';

import {
  AccountType,
  type Asset,
  AssetType,
  type BaseAccount,
  type Chain,
  type ChainAccount,
  type ChainId,
  ChainType,
  CryptoType,
  type PolkadotVaultWallet,
  type ProxiedAccount,
  type ProxiedWallet,
  ProxyType,
  ProxyVariant,
  type ShardAccount,
  SigningType,
  type WalletConnectWallet,
  WalletType,
  type WcAccount,
} from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';

const testKeyring = createTestKeyring();

export const polkadotChainId: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

export const dotAsset: Asset = {
  assetId: 0,
  symbol: 'DOT',
  name: 'Polkadot',
  precision: 10,
  type: AssetType.NATIVE,
  icon: {
    monochrome:
      'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/monochrome/DOT.svg',
    colored: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/colored/DOT.svg',
  },
};

export const polkadotChain: Chain = {
  name: 'Polkadot',
  specName: 'polkadot',
  addressPrefix: 0,
  chainId: polkadotChainId,
  icon: '',
  options: [],
  nodes: [],
  assets: [dotAsset],
  explorers: [
    {
      name: 'Subscan',
      extrinsic: 'https://polkadot.subscan.io/extrinsic/{hash}',
      account: 'https://polkadot.subscan.io/account/{address}',
      multisig: 'https://polkadot.subscan.io/multisig_extrinsic/{index}?call_hash={callHash}',
    },
    {
      name: 'Sub.ID',
      account: 'https://sub.id/{address}',
    },
  ],
};

export const createAccountId = (seed: string) => {
  const derivationPathSeed = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return toAccountId(testKeyring.addFromUri(`//${derivationPathSeed * 1000}`).address);
};

export const createBaseAccount = (id: number = Math.round(Math.random() * 10)): BaseAccount => ({
  id,
  accountId: createAccountId(`Base account ${id}`),
  chainType: ChainType.SUBSTRATE,
  cryptoType: CryptoType.SR25519,
  name: `Base Account ${id}`,
  type: AccountType.BASE,
  walletId: 1,
});

export const createWcAccount = (id: number = Math.round(Math.random() * 10)): WcAccount => ({
  id,
  accountId: createAccountId(`Wc account ${id}`),
  chainId: polkadotChainId,
  chainType: ChainType.SUBSTRATE,
  name: `WalletConnect Account ${id}`,
  type: AccountType.WALLET_CONNECT,
  walletId: 1,
});

export const createProxiedAccount = (id: number = Math.round(Math.random() * 10)): ProxiedAccount => ({
  id,
  accountId: createAccountId(`Proxied account ${id}`),
  proxyAccountId: createAccountId(`Random account ${id}`),
  delay: 0,
  proxyType: ProxyType.ANY,
  proxyVariant: ProxyVariant.REGULAR,
  chainId: polkadotChainId,
  cryptoType: CryptoType.SR25519,
  name: `Proxied Account ${id}`,
  type: AccountType.PROXIED,
  walletId: 1,
  chainType: ChainType.SUBSTRATE,
});

export const createPolkadotWallet = (
  id: number,
  accounts: (BaseAccount | ChainAccount | ShardAccount)[],
): PolkadotVaultWallet => ({
  id,
  accounts,
  type: WalletType.POLKADOT_VAULT,
  isActive: true,
  name: `Polkadot vault wallet ${id}`,
  signingType: SigningType.POLKADOT_VAULT,
});

export const createWcWallet = (id: number, accounts: WcAccount[]): WalletConnectWallet => ({
  id,
  accounts,
  type: WalletType.WALLET_CONNECT,
  isActive: true,
  isConnected: true,
  name: `WalletConnect ${id}`,
  signingType: SigningType.WALLET_CONNECT,
});

export const createProxiedWallet = (id: number, accounts: ProxiedAccount[]): ProxiedWallet => ({
  id,
  accounts,
  type: WalletType.PROXIED,
  isActive: true,
  name: `Proxied wallet ${id}`,
  signingType: SigningType.WALLET_CONNECT,
});
