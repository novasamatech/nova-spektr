import { AccountId, ChainId } from '@renderer/domain/shared-kernel';
import type { Contact } from '@renderer/entities/contact';

export type ExtendedContact = Contact & { index: string };
export type ExtendedWallet = ExtendedContact & { walletName?: string; chainId?: ChainId };

export type SelectedMap = {
  [key: AccountId]: {
    [index: string]: boolean;
  };
};
