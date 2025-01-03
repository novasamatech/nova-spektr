// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

import {
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type ProxiedAccount,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type WcAccount,
} from './account';
import { type ID } from './general';

export interface Wallet {
  id: ID;
  name: string;
  type: WalletType;
  /**
   * @deprecated You should use accounts directly from
   *   `networkDomain.accounts.$list` or filtered in some form. Filtering by
   *   wallet can be done by
   *   `networkDomain.accountsService.filterAccountsByWallet(accounts,
   *   walletId)`.
   */
  accounts: AnyAccount[];
  isActive: boolean;
  /**
   * @deprecated You should use `account.signingType` field instead. Wallet
   *   shouldn't be part of signing process.
   */
  signingType: SigningType;
  isHidden?: boolean;
}

export interface PolkadotVaultWallet extends Wallet {
  type: WalletType.POLKADOT_VAULT;
  accounts: (VaultBaseAccount | VaultChainAccount | VaultShardAccount)[];
}

export interface SingleShardWallet extends Wallet {
  type: WalletType.SINGLE_PARITY_SIGNER;
  accounts: VaultBaseAccount[];
}

export interface MultiShardWallet extends Wallet {
  type: WalletType.MULTISHARD_PARITY_SIGNER;
  accounts: (VaultBaseAccount | VaultChainAccount)[];
}

export interface WatchOnlyWallet extends Wallet {
  type: WalletType.WATCH_ONLY;
  accounts: VaultBaseAccount[];
}

// TODO: try to move signatories data out of account
export interface MultisigWallet extends Wallet {
  type: WalletType.MULTISIG;
  accounts: MultisigAccount[];
}

// TODO: try to move signatories data out of account
export interface FlexibleMultisigWallet extends Wallet {
  type: WalletType.FLEXIBLE_MULTISIG;
  activated: boolean;
  accounts: FlexibleMultisigAccount[];
}

export interface ProxiedWallet extends Wallet {
  type: WalletType.PROXIED;
  accounts: ProxiedAccount[];
}

export interface WalletConnectWallet extends Wallet {
  type: WalletType.WALLET_CONNECT;
  accounts: WcAccount[];
  isConnected: boolean;
}

export interface NovaWalletWallet extends Wallet {
  type: WalletType.NOVA_WALLET;
  accounts: WcAccount[];
  isConnected: boolean;
}

export type WalletsMap = Record<ID, Wallet>;

export const enum WalletType {
  WATCH_ONLY = 'wallet_wo',
  POLKADOT_VAULT = 'wallet_pv',
  MULTISIG = 'wallet_ms',
  FLEXIBLE_MULTISIG = 'wallet_fxms',
  WALLET_CONNECT = 'wallet_wc',
  NOVA_WALLET = 'wallet_nw',
  PROXIED = 'wallet_pxd',

  // Legacy
  MULTISHARD_PARITY_SIGNER = 'wallet_mps',
  SINGLE_PARITY_SIGNER = 'wallet_sps',
}

export type SignableWalletFamily =
  | WalletType.POLKADOT_VAULT
  | WalletType.WALLET_CONNECT
  | WalletType.NOVA_WALLET
  | WalletType.MULTISHARD_PARITY_SIGNER
  | WalletType.SINGLE_PARITY_SIGNER;

export type WalletFamily =
  | WalletType.POLKADOT_VAULT
  | WalletType.MULTISIG
  | WalletType.FLEXIBLE_MULTISIG
  | WalletType.WATCH_ONLY
  | WalletType.WALLET_CONNECT
  | WalletType.NOVA_WALLET
  | WalletType.PROXIED;

export type WalletConnectGroup = WalletConnectWallet | NovaWalletWallet;

export type PolkadotVaultGroup = PolkadotVaultWallet | SingleShardWallet | MultiShardWallet;

export const enum SigningType {
  WATCH_ONLY = 'signing_wo',
  PARITY_SIGNER = 'signing_ps',
  MULTISIG = 'signing_ms',
  POLKADOT_VAULT = 'signing_pv',
  WALLET_CONNECT = 'signing_wc',
}
