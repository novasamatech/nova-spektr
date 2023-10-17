import type { Contact, AccountId, WalletType } from '@renderer/shared/core';

export type ExtendedContact = Contact & { index: string };
export type ExtendedWallet = ExtendedContact & { type?: WalletType };

export type SelectedMap = {
  [key: AccountId]: {
    [index: string]: boolean;
  };
};
