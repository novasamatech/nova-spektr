import { combine } from 'effector';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { isCreatePureProxyTransaction } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';

const $availableTransaction = combine(operationsModel.$multisigTransactions, networkModel.$chains, (txs, chains) => {
  return txs.filter((tx) => tx.chainId in chains);
});

const $account = walletModel.$activeWallet.map((x) => x?.accounts.find(accountUtils.isMultisigAccount) ?? null);

const $incompleteFlexibleMultisigTx = combine($account, $availableTransaction, (account, txs) => {
  const signingTransactions = txs.filter((tx) => tx.status === 'SIGNING');

  if (
    nonNullable(account) &&
    accountUtils.isFlexibleMultisigAccount(account) &&
    nullable(account.proxyAccountId) &&
    signingTransactions.length === 1
  ) {
    return signingTransactions.find((tx) => isCreatePureProxyTransaction(tx.transaction)) ?? null;
  }

  return null;
});

export const operationsContextModel = {
  $account,
  $incompleteFlexibleMultisigTx,
  $availableTransaction,
};
