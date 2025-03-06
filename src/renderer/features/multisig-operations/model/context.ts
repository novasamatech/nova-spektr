import { combine } from 'effector';

import { nonNullable } from '@/shared/lib/utils';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

import { multisigOperations } from './model';

const $account = walletSelect.$selectedAccounts.map(x => x.find(accountUtils.isMultisigAccount) ?? null);

const $incompleteFlexibleMultisigTx = combine(
  { account: $account, wallet: walletSelect.$selectedWallet, txs: multisigOperations.$availableOperations },
  ({ account, wallet, txs }) => {
    const signingTransactions = txs.filter(tx => tx.status === 'pending');

    if (
      nonNullable(account) &&
      walletUtils.isFlexibleMultisig(wallet) &&
      !wallet.activated &&
      signingTransactions.length === 1
    ) {
      // return signingTransactions.find(tx => isCreatePureProxyTransaction(tx.transaction)) ?? null;
      return null;
    }

    return null;
  },
);

export const operationsContextModel = {
  $account,
  $incompleteFlexibleMultisigTx,
};
