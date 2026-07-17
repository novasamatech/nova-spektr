import { createTestKeyring } from '@polkadot/keyring';

import {
  type Asset,
  type AssetId,
  type Chain,
  type ChainId,
  type PolkadotVaultWallet,
  type ProxiedAccount,
  type ProxiedWallet,
  type SingleShardWallet,
  type VaultBaseAccount,
  type VaultChainAccount,
  type WalletConnectWallet,
  type WcAccount,
  AccountType,
  AssetType,
  ChainOptions,
  CryptoType,
  KeyType,
  ProxyVariant,
  SigningType,
  StakingType,
  WalletType,
} from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

const testKeyring = createTestKeyring();

export const polkadotChainId: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
export const kusamaChainId: ChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
export const polkadotAssetHubChainId: ChainId = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f';
export const kusamaAssetHubChainId: ChainId = '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a';
export const polkadotBifrostChainId: ChainId = '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b';
export const mythosChainId: ChainId = '0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9';

export const dotAsset: Asset = {
  assetId: 0 as AssetId,
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
  assetId: 0 as AssetId,
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

export const mythosAsset: Asset = {
  name: 'MYTH',
  assetId: 0 as AssetId,
  symbol: 'MYTH',
  precision: 18,
  type: AssetType.NATIVE,
  priceId: 'mythos',
  icon: {
    monochrome:
      'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/monochrome/MYTH.svg',
    colored: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/colored/MYTH.svg',
  },
};

export const mythosChain: Chain = {
  name: 'Mythos',
  specName: 'polkadot',
  addressPrefix: 29972,
  chainId: mythosChainId,
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Mythos.svg',
  options: [ChainOptions.MULTISIG, ChainOptions.ETHEREUM_BASED, ChainOptions.REGULAR_PROXY, ChainOptions.PURE_PROXY],
  nodes: [
    {
      url: 'wss://polkadot-mythos-rpc.polkadot.io',
      name: 'Parity node',
    },
    {
      url: 'wss://mythos.ibp.network',
      name: 'IBP1 node',
    },
    {
      url: 'wss://mythos.dotters.network',
      name: 'IBP2 node',
    },
  ],
  assets: [mythosAsset],
  explorers: [
    {
      name: 'Subscan',
      extrinsic: 'https://mythos.subscan.io/extrinsic/{hash}',
      account: 'https://mythos.subscan.io/account/{address}',
      multisig: 'https://mythos.subscan.io/multisig_extrinsic/{index}?call_hash={callHash}',
    },
  ],
};

export const polkadotAssetHubChain: Chain = {
  name: 'Polkadot Asset Hub',
  specName: 'polkadot',
  addressPrefix: 0,
  chainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
  parentId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Polkadot_Asset_Hub.svg',
  options: [ChainOptions.MULTISIG, ChainOptions.REGULAR_PROXY, ChainOptions.PURE_PROXY],
  nodes: [],
  assets: [
    {
      name: 'Polkadot',
      assetId: 0 as AssetId,
      symbol: 'DOT',
      precision: 10,
      type: AssetType.NATIVE,
      priceId: 'polkadot',
      icon: {
        monochrome:
          'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/monochrome/DOT.svg',
        colored:
          'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/colored/DOT.svg',
      },
    },
    {
      name: 'USD Tether',
      assetId: 1 as AssetId,
      symbol: 'USDT',
      precision: 6,
      type: AssetType.STATEMINE,
      priceId: 'tether',
      icon: {
        monochrome:
          'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/monochrome/USDT.svg',
        colored:
          'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/colored/USDT.svg',
      },
      typeExtras: {
        assetId: '1984',
      },
    },
    {
      name: 'USD Coin',
      assetId: 2 as AssetId,
      symbol: 'USDC',
      precision: 6,
      type: AssetType.STATEMINE,
      priceId: 'usd-coin',
      icon: {
        monochrome:
          'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/monochrome/USDC.svg',
        colored:
          'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/colored/USDC.svg',
      },
      typeExtras: {
        assetId: '1337',
      },
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

export const createVaultBaseAccount = (
  id = createRandomId(),
  params: Partial<Pick<VaultBaseAccount, 'accountId' | 'name'>> & {
    walletId: number;
  },
): VaultBaseAccount => {
  const accountId = params.accountId ?? createAccountId(`Base account ${id}`);

  return {
    id: `${params.walletId} ${accountId} universal`,
    accountId: params.accountId ?? createAccountId(`Base account ${id}`),
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    name: params?.name ?? `Base Account ${id}`,
    accountType: AccountType.BASE,
    walletId: params.walletId,
    type: 'universal',
    createdAt: Date.now(),
  };
};

export const createVaultChainAccount = (
  id = createRandomId(),
  params: Partial<Pick<VaultChainAccount, 'accountId' | 'name' | 'chainId'>> &
    Pick<VaultChainAccount, 'walletId' | 'derivationPath'>,
): VaultChainAccount => {
  const accountId = params.accountId ?? createAccountId(id);
  const chainId = params.chainId ?? polkadotChainId;

  return {
    id: `${params.walletId} ${accountId} ${chainId}`,
    accountId,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    name: params.name ?? `Base Account ${id}`,
    accountType: AccountType.CHAIN,
    walletId: params.walletId,
    type: 'chain',
    chainId,
    derivationPath: params.derivationPath,
    keyType: KeyType.CUSTOM,
    createdAt: Date.now(),
  };
};

export const createWcAccount = (id: string | number = createRandomId(), walletId = 0): WcAccount => ({
  id: id.toString(),
  accountId: createAccountId(id),
  chainId: polkadotChainId,
  signingType: SigningType.WALLET_CONNECT,
  cryptoType: CryptoType.SR25519,
  name: `WalletConnect Account ${id}`,
  accountType: AccountType.WALLET_CONNECT,
  walletId,
  type: 'chain',
  signingExtras: {},
  createdAt: Date.now(),
});

export const createProxiedAccount = (id: string | number = createRandomId(), walletId = 0): ProxiedAccount => ({
  id: id.toString(),
  accountId: createAccountId(id),
  proxyVariant: ProxyVariant.REGULAR,
  connections: [
    {
      proxyAccountId: createAccountId(`Random account ${id}`),
      delay: 0,
      proxyType: 'Any',
    },
  ],
  deposit: '100',
  chainId: polkadotChainId,
  cryptoType: CryptoType.SR25519,
  name: `Proxied Account ${id}`,
  accountType: AccountType.PROXIED,
  // Real proxied accounts are keyless — created with WATCH_ONLY
  // (features/proxies/model/proxies-model.ts)
  signingType: SigningType.WATCH_ONLY,
  walletId,
  type: 'chain',
  entropyBlockNumber: 0,
  extrinsicIndex: 0,
  createdAt: Date.now(),
});

export const createSingleShardWallet = (
  id: number,
  params: Partial<Pick<SingleShardWallet, 'name' | 'accounts'>> & {
    rootAccountId: AccountId;
  },
): SingleShardWallet => {
  // @ts-expect-error "accounts" is deprecated
  return {
    id,
    rootAccountId: params.rootAccountId,
    type: WalletType.SINGLE_PARITY_SIGNER,
    name: params.name ?? `SingleShard ${id}`,
    ...(params.accounts && { accounts: params.accounts }),
  };
};

export const createLegacyMultishardWallet = (
  id: number,
  params?: Partial<Pick<SingleShardWallet, 'rootAccountId' | 'accounts' | 'name'>>,
): SingleShardWallet => {
  return {
    // @ts-expect-error wallet_mps is a Legacy wallet
    type: 'wallet_mps',
    id,
    name: params?.name ?? `MultiShard ${id}`,
    ...(params?.accounts && { accounts: params.accounts }),
    ...(params?.rootAccountId && { rootAccountId: params.rootAccountId }),
  };
};

export const createPolkadotWallet = (
  id: number,
  params: Pick<PolkadotVaultWallet, 'rootAccountId'> & Partial<Pick<PolkadotVaultWallet, 'accounts' | 'name'>>,
): PolkadotVaultWallet => {
  // @ts-expect-error "accounts" is deprecated
  return {
    id,
    rootAccountId: params.rootAccountId,
    type: WalletType.POLKADOT_VAULT,
    name: params.name ?? `Polkadot vault wallet ${id}`,
    ...(params.accounts && { accounts: params.accounts }),
  };
};

export const createWcWallet = (id: number, accounts: WcAccount[]): WalletConnectWallet => ({
  id,
  accounts,
  type: WalletType.WALLET_CONNECT,
  name: `WalletConnect ${id}`,
});

export const createProxiedWallet = (id: number, accounts: [ProxiedAccount]): ProxiedWallet => ({
  id,
  accounts,
  type: WalletType.PROXIED,
  name: `Proxied wallet ${id}`,
});
