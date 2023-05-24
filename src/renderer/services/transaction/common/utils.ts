import { ApiPromise } from '@polkadot/api';
import { SpRuntimeDispatchError } from '@polkadot/types/lookup';

import { Transaction } from '@renderer/domain/transaction';
import { MAX_WEIGHT, OLD_MULTISIG_ARGS_AMOUNT } from './constants';

export const decodeDispatchError = (error: SpRuntimeDispatchError, api: ApiPromise): string => {
  let errorInfo = error.toString();

  if (error.isModule) {
    const decoded = api.registry.findMetaError(error.asModule);

    errorInfo = decoded.name
      .split(/(?=[A-Z])/)
      .map((w) => w.toLowerCase())
      .join(' ');
  }

  return errorInfo;
};

export const isOldMultisigPallet = (api: ApiPromise): boolean =>
  api.tx.multisig.asMulti.meta.args.length === OLD_MULTISIG_ARGS_AMOUNT;

export const getMaxWeight = (api: ApiPromise, transaction: Transaction) => {
  const maxWeight = transaction.args.maxWeight || MAX_WEIGHT;

  return (isOldMultisigPallet(api) && maxWeight.refTime) || maxWeight;
};
