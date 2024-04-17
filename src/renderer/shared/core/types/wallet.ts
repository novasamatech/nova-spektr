import type { ID } from './general';
import type {
  BaseAccount,
  ShardAccount,
  ChainAccount,
  MultisigAccount,
  ProxiedAccount,
  WalletConnectAccount,
} from './account';

type Wallet_NEW = {
  id: ID;
  name: string;
  type: WalletType;
  isActive: boolean;
  signingType: SigningType;
};

export type PolkadotVaultWallet = Wallet_NEW & {
  accounts: (BaseAccount | ChainAccount | ShardAccount)[];
};

export type SingleShardWallet = Wallet_NEW & {
  account: BaseAccount;
};

export type MultiShardWallet = Wallet_NEW & {
  accounts: (BaseAccount | ChainAccount)[];
};

export type WatchOnlyWallet = Wallet_NEW & {
  account: BaseAccount;
};

export type MultisigWallet = Wallet_NEW & {
  account: MultisigAccount; // TODO: try to move signatories data out of account
};

export type ProxiedWallet = Wallet_NEW & {
  account: ProxiedAccount;
};

export type WalletConnectWallet = Wallet_NEW & {
  accounts: WalletConnectAccount[];
  isConnected: boolean;
};

export type NovaWalletWallet = WalletConnectWallet;

// export type Wallet =
//   | PolkadotVaultWallet
//   | SingleShardWallet
//   | MultiShardWallet
//   | WatchOnlyWallet
//   | MultisigWallet
//   | WalletConnectWallet
//   | NovaWalletWallet
//   | ProxiedWallet;

export type WalletsMap = Record<ID, Wallet_NEW>;

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
