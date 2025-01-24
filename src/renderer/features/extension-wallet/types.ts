import { type Wallet, type WalletType } from '@/shared/core';
import { type UniversalAccount } from '@/domains/network';

export type ExtensionType = 'polkadot-js' | 'talisman' | 'subwallet-js';

export type PolkadotExtensionWallet = Wallet & {
  type: WalletType.POLKADOT_EXTENSION;
  extension: ExtensionType;
};

export type TalismanExtensionWallet = Wallet & {
  type: WalletType.TALISMAN_EXTENSION;
  extension: ExtensionType;
};

export type SubWalletExtensionWallet = Wallet & {
  type: WalletType.SUBWALLET_EXTENSION;
  extension: ExtensionType;
};

export interface ExtensionAccount extends UniversalAccount {
  accountType: 'extension';
  extension: ExtensionType;
}
