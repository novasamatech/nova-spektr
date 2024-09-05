import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const treasury = {
  consts,
  storage,
  schema,
};

export type { TreasuryProposal, TreasuryPaymentState, TreasurySpendStatus } from './schema';
