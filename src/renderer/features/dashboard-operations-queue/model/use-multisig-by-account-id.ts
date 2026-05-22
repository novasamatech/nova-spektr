import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

type MultisigLike = MultisigAccount | FlexibleMultisigAccount;

export function useMultisigByAccountId(): Map<AccountId, MultisigLike> {
  const walletAccounts = useUnit(accounts.$list);

  return useMemo(() => {
    const map = new Map<AccountId, MultisigLike>();
    for (const account of walletAccounts) {
      if (accountUtils.isAnyMultisigAccount(account)) {
        map.set(account.accountId, account);
      }
    }

    return map;
  }, [walletAccounts]);
}
