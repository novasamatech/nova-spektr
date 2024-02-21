import { ApiPromise } from '@polkadot/api';
import { SpRuntimeDispatchError } from '@polkadot/types/lookup';

import { Transaction, DecodedTransaction, TransactionType } from '@entities/transaction/model/transaction';
import {
  MAX_WEIGHT,
  OLD_MULTISIG_ARGS_AMOUNT,
  CONTROLLER_ARG_NAME,
  DEST_WEIGHT_ARG_NAME,
  XcmTypes,
  TransferTypes,
  ManageProxyTypes,
} from './constants';

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

export const isControllerMissing = (api: ApiPromise): boolean =>
  !api.tx.staking.bond.meta.args.find((n) => n.name.toString() === CONTROLLER_ARG_NAME);

export const getMaxWeight = (api: ApiPromise, transaction: Transaction) => {
  const maxWeight = transaction.args.maxWeight || MAX_WEIGHT;

  return (isOldMultisigPallet(api) && maxWeight.refTime) || maxWeight;
};

export const hasDestWeight = (api: ApiPromise): boolean => {
  return !!api.tx.xTokens.transferMultiasset.meta.args.find((n) => n.name.toString() === DEST_WEIGHT_ARG_NAME);
};

export const isXcmTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  if (!transaction?.type) return false;

  return XcmTypes.includes(transaction.type);
};

export const isTransferTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  if (!transaction?.type) return false;

  return TransferTypes.includes(transaction.type);
};

export const isManageProxyTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  if (!transaction?.type) return false;

  return ManageProxyTypes.includes(transaction.type);
};

export const isAddProxyTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  return transaction?.type === TransactionType.ADD_PROXY;
};

export const isRemoveProxyTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  return transaction?.type === TransactionType.REMOVE_PROXY;
};
