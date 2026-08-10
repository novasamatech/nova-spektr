import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

import {
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type ProxiedAccount,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type VaultUniversalKeyAccount,
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
   *   wallet can be done by `accountService.filterAccountsByWallet(accounts,
   *   walletId)`.
   */
  accounts: (AnyAccount & Record<string, any>)[];
  /** Why the wallet is hidden; `null`/`undefined` means it is visible. */
  hiddenReason?: WalletHiddenReason | null;
}

export type WalletHiddenReason = 'unnamed' | 'manual';

export interface PolkadotVaultWallet extends Wallet {
  type: WalletType.POLKADOT_VAULT;
  rootAccountId: AccountId;
  accounts: (VaultChainAccount | VaultShardAccount | VaultUniversalKeyAccount)[];
}

export interface SingleShardWallet extends Wallet {
  type: WalletType.SINGLE_PARITY_SIGNER;
  rootAccountId: AccountId;
  accounts: VaultBaseAccount[];
}

export interface WatchOnlyWallet extends Wallet {
  type: WalletType.WATCH_ONLY;
  accounts: VaultBaseAccount[];
}

export interface MultisigWallet extends Wallet {
  type: WalletType.MULTISIG;
  accounts: MultisigAccount[];
}

export interface FlexibleMultisigWallet extends Wallet {
  type: WalletType.FLEXIBLE_MULTISIG;
  accounts: FlexibleMultisigAccount[];
}

export interface ProxiedWallet extends Wallet {
  type: WalletType.PROXIED;
  accounts: [ProxiedAccount];
}

export interface WalletConnectWallet extends Wallet {
  type: WalletType.WALLET_CONNECT;
  accounts: WcAccount[];
}

export interface NovaWalletWallet extends Wallet {
  type: WalletType.NOVA_WALLET;
  accounts: WcAccount[];
}

export type WalletsMap = Record<ID, Wallet>;

export enum WalletType {
  WATCH_ONLY = 'wallet_wo',
  POLKADOT_VAULT = 'wallet_pv',
  MULTISIG = 'wallet_ms',
  FLEXIBLE_MULTISIG = 'wallet_fxms',
  WALLET_CONNECT = 'wallet_wc',
  NOVA_WALLET = 'wallet_nw',
  PROXIED = 'wallet_pxd',
  POLKADOT_EXTENSION = 'wallet_polkadot_ext',
  TALISMAN_EXTENSION = 'wallet_talisman_ext',
  SUBWALLET_EXTENSION = 'wallet_subwallet_ext',
  SINGLE_PARITY_SIGNER = 'wallet_sps',
}

export type SignableWalletFamily =
  | WalletType.POLKADOT_VAULT
  | WalletType.POLKADOT_EXTENSION
  | WalletType.TALISMAN_EXTENSION
  | WalletType.SUBWALLET_EXTENSION
  | WalletType.WALLET_CONNECT
  | WalletType.NOVA_WALLET
  | WalletType.SINGLE_PARITY_SIGNER;

export type WalletFamily =
  | WalletType.POLKADOT_VAULT
  | WalletType.POLKADOT_EXTENSION
  | WalletType.TALISMAN_EXTENSION
  | WalletType.SUBWALLET_EXTENSION
  | WalletType.MULTISIG
  | WalletType.FLEXIBLE_MULTISIG
  | WalletType.WATCH_ONLY
  | WalletType.WALLET_CONNECT
  | WalletType.NOVA_WALLET
  | WalletType.PROXIED;

export type WalletConnectGroup = WalletConnectWallet | NovaWalletWallet;

export type PolkadotVaultGroup = PolkadotVaultWallet | SingleShardWallet;

export const enum SigningType {
  WATCH_ONLY = 'signing_wo',
  PARITY_SIGNER = 'signing_ps',
  MULTISIG = 'signing_ms',
  POLKADOT_VAULT = 'signing_pv',
  EXTENSION = 'signing_ext',
  WALLET_CONNECT = 'signing_wc',
}
