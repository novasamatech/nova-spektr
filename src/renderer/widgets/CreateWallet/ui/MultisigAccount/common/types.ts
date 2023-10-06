import type { Contact, AccountId, ChainId } from '@renderer/shared/core';

export type ExtendedContact = Contact & { index: string };
export type ExtendedWallet = ExtendedContact & { walletName?: string; chainId?: ChainId };

export type SelectedMap = {
  [key: AccountId]: {
    [index: string]: boolean;
  };
};
