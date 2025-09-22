import { combine } from 'effector';
import { createGate } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { permissionUtils } from '@/entities/wallet';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const $canCreateProxy = combine(
  {
    wallet: $wallet,
    accounts: accounts.$list,
  },
  ({ wallet, accounts }) => {
    if (nullable(wallet)) return false;

    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    if (walletAccounts.length === 0) return false;

    const canCreateAnyProxy = permissionUtils.canCreateAnyProxy(wallet);
    const canCreateNonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);

    return canCreateAnyProxy || canCreateNonAnyProxy;
  },
);

export const walletDetailsModel = {
  flow,
  $wallet,
  $canCreateProxy,
};
