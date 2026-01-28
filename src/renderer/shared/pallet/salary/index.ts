import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const salaryPallet = {
  consts,
  schema,
  storage,
};

export type { SalaryClaimState, SalaryClaimantStatus, SalaryStatusType } from './schema';
