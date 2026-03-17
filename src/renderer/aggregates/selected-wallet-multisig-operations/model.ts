import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
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
    const accountOperations = operations.filter(
      tx => multisigAccountId === tx.multisigAccountId && tx.chainId in chains,
    );

    if (accounts.some(accountUtils.isFlexibleMultisigAccount)) {
      const proxiedAccountId = account.accountId;

      return accountOperations.filter(tx => tx.proxiedAccountId === proxiedAccountId);
    }

    return accountOperations;
  },
);

export const selectedWalletMultisigOperations = {
  $list,
};
