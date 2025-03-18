import { type ApiPromise } from '@polkadot/api';
import { type DispatchError } from '@polkadot/types/interfaces';
import { type SpRuntimeDispatchError } from '@polkadot/types/lookup';

import { type Transaction } from '@/shared/core';

import { CONTROLLER_ARG_NAME, DEST_WEIGHT_ARG_NAME, MAX_WEIGHT, OLD_MULTISIG_ARGS_AMOUNT } from './constants';

export const decodeDispatchError = (error: DispatchError | SpRuntimeDispatchError, api: ApiPromise): string => {
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

export const isControllerMissing = (api: ApiPromise): boolean =>
  !api.tx.staking.bond.meta.args.find((n) => n.name.toString() === CONTROLLER_ARG_NAME);

export const getMaxWeight = (api: ApiPromise, transaction: Transaction) => {
  const maxWeight = transaction.args.maxWeight || MAX_WEIGHT;

  return (isOldMultisigPallet(api) && maxWeight.refTime) || maxWeight;
};

export const hasDestWeight = (api: ApiPromise): boolean => {
  return !!api.tx.xTokens.transferMultiasset.meta.args.find((n) => n.name.toString() === DEST_WEIGHT_ARG_NAME);
};
