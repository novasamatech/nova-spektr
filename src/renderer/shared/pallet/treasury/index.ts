import { consts } from './consts';
import * as schema from './schema';
import { state } from './state';

export const treasury = {
  consts,
  state,
  schema,
};

export type { TreasuryProposal, TreasuryPaymentState, TreasurySpendStatus } from './schema';
