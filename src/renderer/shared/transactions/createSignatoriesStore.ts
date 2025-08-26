import { type Store, combine } from 'effector';

import { type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';

type Params = {
  chain: Store<Chain | null>;
  accounts: Store<AnyAccount[]>;
  initiator: Store<AnyAccount | null>;
};

export const createSignatoriesStore = ({ chain, accounts, initiator }: Params) => {
  return combine({ chain, accounts, initiator }, ({ chain, accounts, initiator }) => {
    if (nullable(initiator) || nullable(chain)) return [];
    return accountService.findSignatories(initiator, accounts, chain);
  });
};
