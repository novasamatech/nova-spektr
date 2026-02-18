import { type ApiPromise } from '@polkadot/api';

import { type ChainId, type Transaction } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';
import { getExtrinsic } from '@/entities/transaction';

export const operationsUtils = {
  isMultisigAlreadyExists,
};

type Params = {
  coreTxs: Transaction[];
  transactions: MultisigOperation[];
  apis: Record<ChainId, ApiPromise>;
};

function isMultisigAlreadyExists({ coreTxs, transactions, apis }: Params) {
  const coreTx = coreTxs[0];
  if (!coreTx) return false;

  const api = apis[coreTx.chainId];

  if (!api) return false;

  if (!transactions || !api || !coreTx) return false;

  const callHash = getExtrinsic[coreTx.type](coreTx.args, api).method.hash.toHex();

  return transactions.some((tx) => {
    return tx.status == 'pending' && callHash === tx.callHash;
  });
}
