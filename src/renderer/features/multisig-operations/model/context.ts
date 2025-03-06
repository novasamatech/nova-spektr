import { combine } from 'effector';

import { nonNullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { isCreatePureProxyTransaction } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

const $availableTransaction = combine(operationsModel.$multisigTransactions, networkModel.$chains, (txs, chains) => {
  return txs.filter(tx => tx.chainId in chains);
});

const $account = walletSelect.$selectedAccounts.map(x => x.find(accountUtils.isMultisigAccount) ?? null);

const $incompleteFlexibleMultisigTx = combine(
  { account: $account, wallet: walletSelect.$selectedWallet, txs: $availableTransaction },
  ({ account, wallet, txs }) => {
    const signingTransactions = txs.filter(tx => tx.status === 'SIGNING');

    if (
      nonNullable(account) &&
      walletUtils.isFlexibleMultisig(wallet) &&
      !wallet.activated &&
      signingTransactions.length === 1
    ) {
      return signingTransactions.find(tx => isCreatePureProxyTransaction(tx.transaction)) ?? null;
    }

    return null;
  },
);

export const operationsContextModel = {
  $account,
  $incompleteFlexibleMultisigTx,
  $availableTransaction,
};
