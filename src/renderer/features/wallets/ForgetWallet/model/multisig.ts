import { combine } from 'effector';

import { accountService, accounts, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletUtils } from '@/entities/wallet';

import { forgetWalletModel } from './forget-wallet-model';

const $list = combine(
  {
    wallet: forgetWalletModel.$wallet,
    operations: multisigOperation.$list,
    chains: networkModel.$chains,
    accounts: accounts.$list,
  },
  ({ accounts, operations, chains, wallet }) => {
    if (!wallet || !walletUtils.isRegularMultisig(wallet)) {
      return [];
    }

    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);

    const accountIds = walletAccounts.map((a) => a.accountId);
    return operations.filter(
      (tx) => accountIds.includes(tx.multisigAccountId) && tx.chainId in chains && tx.status === 'pending',
    );
  },
);

export const selectedWalletMultisigOperations = {
  $list,
};
