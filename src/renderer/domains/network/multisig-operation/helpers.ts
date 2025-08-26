import { BN } from '@polkadot/util';

import { type NoID, type Serializable } from '@/shared/core';

import { type MultisigOperation } from './types';

export const serializeOperation = <T extends NoID<MultisigOperation>>(tx: T) => {
  return {
    ...tx,
    deposit: tx.deposit?.toString(),
  } as Serializable<T>;
};

export const deserializeOperation = (tx: Serializable<MultisigOperation>): MultisigOperation => {
  return {
    ...tx,
    deposit: tx.deposit ? new BN(tx.deposit) : undefined,
  };
};
