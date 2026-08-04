import { type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Payee } from '../types';

/**
 * Own nomination intent of a stash account.
 */
export type Nomination = {
  targets: AccountId[];
  submittedIn: EraIndex;
};

/**
 * `null` means the stash has no nomination / reward destination on chain.
 */
export type NominationsMap = Record<AccountId, Nomination | null>;
export type PayeeMap = Record<AccountId, Payee | null>;
