import { type Contact, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type WalletSignatories = {
  wallets: [Wallet, AccountId][];
  contacts: Contact[];
  people: AccountId[];
};

export interface SignatoryInfo {
  index: number;
  address: string;
  // Contact doesn't belong to wallet
  walletId?: string;
}
