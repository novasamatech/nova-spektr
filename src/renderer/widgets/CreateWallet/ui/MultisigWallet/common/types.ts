import type { AccountType, Contact, WalletType } from '@shared/core';

export type ExtendedContact = Contact & { index: string };
export type ExtendedWallet = ExtendedContact & { type?: WalletType };
export type ExtendedAccount = ExtendedContact & { type?: AccountType; walletId: number };
