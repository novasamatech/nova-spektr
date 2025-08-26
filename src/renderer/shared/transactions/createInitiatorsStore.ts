import { type Store, combine } from 'effector';

import { type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';

type Params = {
  chain: Store<Chain | null>;
  accounts: Store<AnyAccount[]>;
};

export const createInitiatorsStore = ({ chain, accounts }: Params) => {
  return combine({ chain, accounts }, ({ chain, accounts }) => {
    if (nullable(chain)) return [];
    return accountService.findInitiators(accounts, chain);
  });
};
