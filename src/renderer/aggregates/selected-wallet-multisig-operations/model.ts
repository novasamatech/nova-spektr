import { combine } from 'effector';

import { type DecodedTransaction } from '@/shared/core';
import { nullable, toAccountId } from '@/shared/lib/utils';
import { multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { multisigService } from '@/features/multisig-wallet';

const $list = combine(
  {
    accounts: walletSelect.$selectedAccounts,
    operations: multisigOperation.$list,
    chains: networkModel.$chains,
  },
  ({ accounts, operations, chains }) => {
    const account = accounts.find(accountUtils.isAnyMultisigAccount);
    if (nullable(account)) return [];

    const multisigAccountId = multisigService.getMultisigAccountId(account);
    const accountOperations = operations.filter(tx => multisigAccountId === tx.accountId && tx.chainId in chains);

    if (accounts.some(accountUtils.isFlexibleMultisigAccount)) {
      const proxiedAccountId = account.accountId;

      return accountOperations.filter(tx => {
        const isProxyTx =
          tx.method === 'proxy' &&
          tx.section === 'proxy' &&
          proxiedAccountId === toAccountId(tx.transaction?.args.real);

        // Nova Wallet wraps proxy calls inside utility.batchAll transactions instead of sending direct proxy.proxy calls.
        // Without this check, operations created by Nova Wallet would
        // be treated as regular multisig operations instead of flexible multisig operations.
        const isBatchAllTx =
          tx.method === 'batchAll' &&
          tx.section === 'utility' &&
          tx.transaction?.args.transactions.some((t: DecodedTransaction) => proxiedAccountId && t.args.real);

        return isProxyTx || isBatchAllTx;
      });
    }

    return accountOperations;
  },
);

export const selectedWalletMultisigOperations = {
  $list,
};
