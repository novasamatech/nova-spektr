import { BN } from '@polkadot/util';

import { type NoID } from '@/shared/core';

import { type MultisigOperation, type MultisigOperationDB } from './types';

export const transformDepositToString = <T extends NoID<MultisigOperation>>(
  tx: T,
): Omit<T, 'deposit'> & { deposit?: string } => {
  return {
    ...tx,
    deposit: tx.deposit?.toString(),
  };
};

export const transformDepositToBN = (tx: MultisigOperationDB): MultisigOperation => {
  return {
    ...tx,
    deposit: tx.deposit ? new BN(tx.deposit) : undefined,
  };
};
