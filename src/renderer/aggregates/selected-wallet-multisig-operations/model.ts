import { combine } from 'effector';

import { toAccountId } from '@/shared/lib/utils';
import { multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

const $list = combine(
  {
    accounts: walletSelect.$selectedAccounts,
    operations: multisigOperation.$list,
    chains: networkModel.$chains,
  },
  ({ accounts, operations, chains }) => {
    const accountIds = accounts.map(a => a.accountId);

    if (accounts.some(accountUtils.isFlexibleMultisigAccount)) {
      return operations.filter(
        tx =>
          tx.method === 'proxy' &&
          tx.section === 'proxy' &&
          accountIds.includes(toAccountId(tx.transaction?.args.real)) &&
          tx.chainId in chains,
      );
    }

    return operations.filter(tx => accountIds.includes(tx.accountId) && tx.chainId in chains);
  },
);

export const selectedWalletMultisigOperations = {
  $list,
};
