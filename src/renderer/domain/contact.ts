import { AccountID, PublicKey } from './shared-kernel';

export type Contact = {
  name: string;
  accountId: AccountID;
  publicKey: PublicKey;
  matrixId?: string;
};
