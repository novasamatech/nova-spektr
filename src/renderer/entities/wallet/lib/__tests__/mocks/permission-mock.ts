import {
  AccountType,
  type MultiShardWallet,
  type MultisigWallet,
  type NovaWalletWallet,
  type PolkadotVaultWallet,
  type ProxiedAccount,
  type ProxiedWallet,
  ProxyType,
  type SingleShardWallet,
  type WalletConnectWallet,
  WalletType,
  type WatchOnlyWallet,
} from '@shared/core';

// Wallets

const watchOnlyWallet = {
  name: 'watch only wallet',
  type: WalletType.WATCH_ONLY,
} as WatchOnlyWallet;

const vaultWallet = {
  name: 'polkadot vault wallet',
  type: WalletType.POLKADOT_VAULT,
} as PolkadotVaultWallet;

const novaWallet = {
  name: 'nova wallet',
  type: WalletType.NOVA_WALLET,
} as NovaWalletWallet;

const walletConnectWallet = {
  name: 'wallet connect',
  type: WalletType.WALLET_CONNECT,
} as WalletConnectWallet;

const singleParitySignerWallet = {
  name: 'single parity signer wallet',
  type: WalletType.SINGLE_PARITY_SIGNER,
} as SingleShardWallet;

const multishardWallet = {
  name: 'multishard wallet',
  type: WalletType.MULTISHARD_PARITY_SIGNER,
} as MultiShardWallet;

const multisigWallet = {
  name: 'multisig wallet',
  type: WalletType.MULTISIG,
} as MultisigWallet;

const proxiedWallet = {
  name: 'proxied wallet',
  type: WalletType.PROXIED,
} as ProxiedWallet;

// Accounts

const anyProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.ANY,
} as ProxiedAccount;

const nonTransferProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.NON_TRANSFER,
} as ProxiedAccount;

const stakingProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.STAKING,
} as ProxiedAccount;

const auctionProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.AUCTION,
} as ProxiedAccount;

const cancelProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.CANCEL_PROXY,
} as ProxiedAccount;

const governanceProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.GOVERNANCE,
} as ProxiedAccount;

const identityJudgementProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.IDENTITY_JUDGEMENT,
} as ProxiedAccount;

const nominationPoolsProxyAccount = {
  type: AccountType.PROXIED,
  proxyType: ProxyType.NOMINATION_POOLS,
} as ProxiedAccount;

export const permissionMocks = {
  wallets: {
    watchOnlyWallet,
    vaultWallet,
    novaWallet,
    walletConnectWallet,
    singleParitySignerWallet,
    multishardWallet,
    multisigWallet,
    proxiedWallet,
  },
  accounts: {
    anyProxyAccount,
    nonTransferProxyAccount,
    stakingProxyAccount,
    auctionProxyAccount,
    cancelProxyAccount,
    governanceProxyAccount,
    identityJudgementProxyAccount,
    nominationPoolsProxyAccount,
  },
};
