import { type Address } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type WalletCandidate = {
  source: 'wallet';
  walletId: string;
  name: string;
  address: Address;
  accountId: AccountId;
  signatories: AccountId[];
  threshold: number;
};

export type ContactCandidate = {
  source: 'contact';
  contactId: string;
  name: string;
  address: Address;
  accountId: AccountId;
  signatories: AccountId[];
  threshold: number;
};

export type MultisigCandidate = WalletCandidate | ContactCandidate;
