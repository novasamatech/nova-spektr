import { AccountId, Address } from '@renderer/domain/shared-kernel';

export type Signatory = {
  name?: string;
  address: Address;
  accountId: AccountId;
  matrixId?: string;
};
