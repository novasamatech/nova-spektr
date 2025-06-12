import { combine } from 'effector';

import { multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletSelect } from '@/aggregates/wallet-select';

const $list = combine(
  {
    accounts: walletSelect.$selectedAccounts,
    operations: multisigOperation.$list,
    chains: networkModel.$chains,
  },
  ({ accounts, operations, chains }) => {
    const accountIds = accounts.map(a => a.accountId);
    return operations.filter(tx => accountIds.includes(tx.accountId) && tx.chainId in chains);
  },
);

export const selectedWalletMultisigOperations = {
  $list,
};
