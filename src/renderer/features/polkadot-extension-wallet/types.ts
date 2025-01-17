import { type Wallet, type WalletType } from '@/shared/core';
import { type UniversalAccount } from '@/domains/network';

// TODO add more extensions
export type ExtensionType = 'polkadot-js';

export type PolkadotExtensionWallet = Wallet & {
  type: WalletType.POLKADOT_EXTENSION;
  extension: ExtensionType;
};

export interface PolkadotExtensionAccount extends UniversalAccount {
  accountType: 'extension';
  extension: ExtensionType;
}
