import { type Wallet, type WalletType } from '@/shared/core';
import { type UniversalAccount } from '@/domains/network';

export type PolkadotExtensionWallet = Wallet & {
  type: WalletType.POLKADOT_EXTENSION;
};

export interface PolkadotExtensionAccount extends UniversalAccount {
  accountType: 'polkadot_extension';
}
