import { Contact } from '@renderer/entities/contact/model/contact';
import { ChainId, AccountId } from '@renderer/domain/shared-kernel';

export type ExtendedContact = Contact & { index: string };
export type ExtendedWallet = ExtendedContact & { walletName?: string; chainId?: ChainId };

export type SelectedMap = {
  [key: AccountId]: {
    [index: string]: boolean;
  };
};
