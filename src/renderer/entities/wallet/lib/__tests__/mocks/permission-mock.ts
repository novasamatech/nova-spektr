import {
  AccountType,
  type MultiShardWallet,
  type MultisigWallet,
  type NovaWalletWallet,
  type PolkadotVaultWallet,
  type ProxiedAccount,
  type ProxiedWallet,
  type SingleShardWallet,
  type WalletConnectWallet,
  WalletType,
  type WatchOnlyWallet,
} from '@/shared/core';

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
  accountType: AccountType.PROXIED,
  proxyType: 'Any',
} as ProxiedAccount;

const nonTransferProxyAccount = {
  accountType: AccountType.PROXIED,
  proxyType: 'NonTransfer',
} as ProxiedAccount;

const stakingProxyAccount = {
  accountType: AccountType.PROXIED,
  proxyType: 'Staking',
} as ProxiedAccount;

const auctionProxyAccount = {
  accountType: AccountType.PROXIED,
  proxyType: 'Auction',
} as ProxiedAccount;

const cancelProxyAccount = {
  accountType: AccountType.PROXIED,
  proxyType: 'CancelProxy',
} as ProxiedAccount;

const governanceProxyAccount = {
  accountType: AccountType.PROXIED,
  proxyType: 'Governance',
} as ProxiedAccount;

const identityJudgementProxyAccount = {
  accountType: AccountType.PROXIED,
  proxyType: 'IdentityJudgement',
} as ProxiedAccount;

const nominationPoolsProxyAccount = {
  accountType: AccountType.PROXIED,
  proxyType: 'NominationPools',
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
