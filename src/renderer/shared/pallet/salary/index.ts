import { consts } from './consts';
import * as schema from './schema';
import { state } from './state';

export const fellowshipSalary = {
  consts,
  schema,
  state,
};

export type { SalaryClaimantStatus, SalaryClaimState, SalaryStatusType } from './schema';
