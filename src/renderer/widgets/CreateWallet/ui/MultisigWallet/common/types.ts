import type { Contact, WalletType } from '@shared/core';

export type ExtendedContact = Contact & { index: string };
export type ExtendedWallet = ExtendedContact & { type?: WalletType };
