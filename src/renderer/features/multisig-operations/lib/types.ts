import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';

export type OperationWithAccount = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};
