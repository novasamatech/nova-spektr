import {
  AccountType,
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
  accounts: [{ name: '1' }],
  type: WalletType.POLKADOT_VAULT,
} as PolkadotVaultWallet;

const novaWallet = {
  name: 'nova wallet',
  accounts: [{ name: '1' }],
  type: WalletType.NOVA_WALLET,
} as NovaWalletWallet;

const walletConnectWallet = {
  name: 'wallet connect',
  accounts: [{ name: '1' }],
  type: WalletType.WALLET_CONNECT,
} as WalletConnectWallet;

const singleParitySignerWallet = {
  name: 'single parity signer wallet',
  accounts: [{ name: '1' }],
  type: WalletType.SINGLE_PARITY_SIGNER,
} as SingleShardWallet;

const multisigWallet = {
  name: 'multisig wallet',
  accounts: [{ name: '1' }],
  type: WalletType.MULTISIG,
} as MultisigWallet;

const proxiedWallet = {
  name: 'proxied wallet',
  type: WalletType.PROXIED,
} as ProxiedWallet;

// Accounts

const anyProxyAccount = {
  accountType: AccountType.PROXIED,
  connections: [{ proxyType: 'Any' }],
} as ProxiedAccount;

const nonTransferProxyAccount = {
  accountType: AccountType.PROXIED,
  connections: [{ proxyType: 'NonTransfer' }],
} as ProxiedAccount;

const stakingProxyAccount = {
  accountType: AccountType.PROXIED,
  connections: [{ proxyType: 'Staking' }],
} as ProxiedAccount;

const auctionProxyAccount = {
  accountType: AccountType.PROXIED,
  connections: [{ proxyType: 'Auction' }],
} as ProxiedAccount;

const cancelProxyAccount = {
  accountType: AccountType.PROXIED,
  connections: [{ proxyType: 'CancelProxy' }],
} as ProxiedAccount;

const governanceProxyAccount = {
  accountType: AccountType.PROXIED,
  connections: [{ proxyType: 'Governance' }],
} as ProxiedAccount;

const identityJudgementProxyAccount = {
  accountType: AccountType.PROXIED,
  connections: [{ proxyType: 'IdentityJudgement' }],
} as ProxiedAccount;

const nominationPoolsProxyAccount = {
  accountType: AccountType.PROXIED,
  connections: [{ proxyType: 'NominationPools' }],
} as ProxiedAccount;

export const permissionMocks = {
  wallets: {
    watchOnlyWallet,
    vaultWallet,
    novaWallet,
    walletConnectWallet,
    singleParitySignerWallet,
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
