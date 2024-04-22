import type { ID } from './general';
import type { BaseAccount, ShardAccount, ChainAccount, MultisigAccount, ProxiedAccount, WcAccount } from './account';

export type AbstractWallet = {
  id: ID;
  name: string;
  type: WalletType;
  isActive: boolean;
  signingType: SigningType;
};

export type PolkadotVaultWallet = AbstractWallet & {
  type: WalletType.POLKADOT_VAULT;
  accounts: Array<BaseAccount | ChainAccount | ShardAccount>;
};

export type SingleShardWallet = AbstractWallet & {
  type: WalletType.SINGLE_PARITY_SIGNER;
  accounts: BaseAccount[];
};

export type MultiShardWallet = AbstractWallet & {
  type: WalletType.MULTISHARD_PARITY_SIGNER;
  accounts: Array<BaseAccount | ChainAccount>;
};

export type WatchOnlyWallet = AbstractWallet & {
  type: WalletType.WATCH_ONLY;
  accounts: BaseAccount[];
};

// TODO: try to move signatories data out of account
export type MultisigWallet = AbstractWallet & {
  type: WalletType.MULTISIG;
  accounts: MultisigAccount[];
};

export type ProxiedWallet = AbstractWallet & {
  type: WalletType.PROXIED;
  accounts: ProxiedAccount[];
};

export type WalletConnectWallet = AbstractWallet & {
  type: WalletType.WALLET_CONNECT;
  accounts: WcAccount[];
  isConnected: boolean;
};

export type NovaWalletWallet = AbstractWallet & {
  type: WalletType.NOVA_WALLET;
  accounts: WcAccount[];
  isConnected: boolean;
};

export type Wallet =
  | PolkadotVaultWallet
  | SingleShardWallet
  | MultiShardWallet
  | WatchOnlyWallet
  | MultisigWallet
  | WalletConnectWallet
  | NovaWalletWallet
  | ProxiedWallet;

export type WalletAccounts = Wallet['accounts'];

export type WalletsMap = Record<ID, Wallet>;

export const enum WalletType {
  WATCH_ONLY = 'wallet_wo',
  POLKADOT_VAULT = 'wallet_pv',
  MULTISIG = 'wallet_ms',
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
