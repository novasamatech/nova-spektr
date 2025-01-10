import { createTestKeyring } from '@polkadot/keyring';

import {
  AccountType,
  type Asset,
  AssetType,
  type Chain,
  type ChainId,
  ChainOptions,
  CryptoType,
  type PolkadotVaultWallet,
  type ProxiedAccount,
  type ProxiedWallet,
  ProxyVariant,
  SigningType,
  StakingType,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type WalletConnectWallet,
  WalletType,
  type WcAccount,
} from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

const testKeyring = createTestKeyring();

export const polkadotChainId: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
export const kusamaChainId: ChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';

export const dotAsset: Asset = {
  assetId: 0,
  symbol: 'DOT',
  name: 'Polkadot',
  precision: 10,
  type: AssetType.NATIVE,
  priceId: 'polkadot',
  staking: StakingType.RELAYCHAIN,
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
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Polkadot.svg',
  options: [ChainOptions.MULTISIG, ChainOptions.GOVERNANCE, ChainOptions.REGULAR_PROXY, ChainOptions.PURE_PROXY],
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

export const kusamaAsset: Asset = {
  name: 'Kusama',
  assetId: 0,
  symbol: 'KSM',
  precision: 12,
  type: AssetType.NATIVE,
  priceId: 'kusama',
  staking: StakingType.RELAYCHAIN,
  icon: {
    monochrome:
      'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/monochrome/KSM.svg',
    colored: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/colored/KSM.svg',
  },
};

export const kusamaChain: Chain = {
  name: 'Kusama',
  specName: 'kusama',
  addressPrefix: 2,
  chainId: kusamaChainId,
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Kusama.svg',
  options: [ChainOptions.MULTISIG, ChainOptions.GOVERNANCE, ChainOptions.REGULAR_PROXY, ChainOptions.PURE_PROXY],
  nodes: [],
  assets: [kusamaAsset],
  explorers: [
    {
      name: 'Subscan',
      extrinsic: 'https://kusama.subscan.io/extrinsic/{hash}',
      account: 'https://kusama.subscan.io/account/{address}',
      multisig: 'https://kusama.subscan.io/multisig_extrinsic/{index}?call_hash={callHash}',
    },
    {
      name: 'Sub.ID',
      account: 'https://sub.id/{address}',
    },
  ],
};

export const createRandomId = () => Math.round(Math.random() * 10).toString();

export const createAccountId = (seed: string | number = '0') => {
  const derivationPathSeed = seed
    .toString()
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return pjsSchema.helpers.toAccountId(toAccountId(testKeyring.addFromUri(`//${derivationPathSeed * 1000}`).address));
};

export const createBaseAccount = (id = createRandomId()): VaultBaseAccount => ({
  id,
  accountId: createAccountId(`Base account ${id}`),
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  name: `Base Account ${id}`,
  accountType: AccountType.BASE,
  walletId: 1,
  type: 'universal',
});

export const createWcAccount = (id = createRandomId(), walletId = 0): WcAccount => ({
  id,
  accountId: createAccountId(`Wc account ${id}`),
  chainId: polkadotChainId,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  name: `WalletConnect Account ${id}`,
  accountType: AccountType.WALLET_CONNECT,
  walletId,
  type: 'chain',
  signingExtras: {},
});

export const createProxiedAccount = (id = createRandomId(), walletId = 0): ProxiedAccount => ({
  id,
  accountId: createAccountId(`Proxied account ${id}`),
  proxyAccountId: createAccountId(`Random account ${id}`),
  delay: 0,
  proxyType: 'Any',
  proxyVariant: ProxyVariant.REGULAR,
  chainId: polkadotChainId,
  cryptoType: CryptoType.SR25519,
  name: `Proxied Account ${id}`,
  accountType: AccountType.PROXIED,
  signingType: SigningType.POLKADOT_VAULT,
  walletId,
  type: 'chain',
});

export const createPolkadotWallet = (
  id: number,
  accounts: (VaultBaseAccount | VaultChainAccount | VaultShardAccount)[],
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
