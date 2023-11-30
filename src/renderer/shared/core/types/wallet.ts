import type { ID } from './general';
import {Account} from "@shared/core";

type AbstractWallet = {
  id: ID;
  name: string;
  type: WalletType;
  isActive: boolean;
  signingType: SigningType;
};

export type PolkadotVaultWallet = AbstractWallet;
export type SingleShardWallet = AbstractWallet;
export type MultiShardWallet = AbstractWallet;
export type WatchOnlyWallet = AbstractWallet;
export type MultisigWallet = AbstractWallet;

export type WalletConnectWallet = AbstractWallet & {
  isConnected: boolean;
};

export type NovaWalletWallet = WalletConnectWallet;

export type Wallet =
  | PolkadotVaultWallet
  | SingleShardWallet
  | MultiShardWallet
  | WatchOnlyWallet
  | MultisigWallet
  | WalletConnectWallet
  | NovaWalletWallet;

export const enum WalletType {
  WATCH_ONLY = 'wallet_wo',
  POLKADOT_VAULT = 'wallet_pv',
  MULTISIG = 'wallet_ms',
  WALLET_CONNECT = 'wallet_wc',
  NOVA_WALLET = 'wallet_nw',

  // Legacy
  MULTISHARD_PARITY_SIGNER = 'wallet_mps',
  SINGLE_PARITY_SIGNER = 'wallet_sps',
}

export type WalletFamily =
  | WalletType.POLKADOT_VAULT
  | WalletType.MULTISIG
  | WalletType.WATCH_ONLY
  | WalletType.WALLET_CONNECT
  | WalletType.NOVA_WALLET;

export const enum SigningType {
  WATCH_ONLY = 'signing_wo',
  PARITY_SIGNER = 'signing_ps',
  MULTISIG = 'signing_ms',
  // POLKADOT_VAULT = 'signing_pv',
  WALLET_CONNECT = 'signing_wc',
  // NOVA_WALLET = 'signing_nw',
}


export type AccountInWallet = {
  wallet: Wallet
  account: Account
}

export type AccountsInWallet = {
  wallet: Wallet
  accounts: Account[]
}

export function asMany(accountInWallet: AccountInWallet): AccountsInWallet {
  return {
    wallet: accountInWallet.wallet,
    accounts: [accountInWallet.account]
  }
}
