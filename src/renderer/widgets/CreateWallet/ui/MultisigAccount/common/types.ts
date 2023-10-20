import type { Contact, WalletType } from '@renderer/shared/core';

export type ExtendedContact = Contact & { index: string };
export type ExtendedWallet = ExtendedContact & { type?: WalletType };
