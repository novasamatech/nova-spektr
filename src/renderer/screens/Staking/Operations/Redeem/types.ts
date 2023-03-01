import { AccountDS } from '@renderer/services/storage';

export type AccountWithAmount = AccountDS & {
  amount?: string;
};
