import { type ApiPromise } from '@polkadot/api';

import { type ChainId, type MultisigTransaction, MultisigTxInitStatus, type Transaction } from '@/shared/core';
import { getExtrinsic } from '@/entities/transaction/lib/extrinsicService';

export const operationsUtils = {
  isMultisigAlreadyExists,
};

type Params = {
  coreTxs: Transaction[];
  transactions: MultisigTransaction[];
  apis: Record<ChainId, ApiPromise>;
};

function isMultisigAlreadyExists({ coreTxs, transactions, apis }: Params) {
  const coreTx = coreTxs[0];
  const api = apis[coreTx?.chainId];

  if (!api || !coreTx) return false;

  if (!transactions || !api || !coreTx) return false;

  const callHash = getExtrinsic[coreTx.type](coreTx.args, api).method.hash.toHex();

  return transactions.some((tx) => tx.status == MultisigTxInitStatus.SIGNING && callHash === tx.callHash);
}
