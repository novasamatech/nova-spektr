import { AccountId, Address } from '@renderer/domain/shared-kernel';

export type Contact = {
  name: string;
  address: Address;
  accountId: AccountId;
  matrixId?: string;
};
