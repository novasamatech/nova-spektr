import { type Address, type Contact, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigCandidate } from '@/aggregates/multisig-candidates';

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

export type ExecutionMode = 'trusted' | 'verified';

export type SelectedTarget =
  | { kind: 'existing'; candidate: MultisigCandidate }
  | { kind: 'modify'; signatories: AccountId[]; threshold: number; derivedAddress: Address };
