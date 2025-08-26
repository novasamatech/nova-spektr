import { type Store, combine } from 'effector';

import { type Chain } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';

type Params = {
  chain: Store<Chain | null>;
  accounts: Store<AnyAccount[]>;
  initiator: Store<AnyAccount | null>;
  signatory: Store<AnyAccount | null>;
};

export function createRouteStore({ accounts, initiator, signatory, chain }: Params) {
  return combine({ accounts, initiator, signatory, chain }, (params) => {
    if (nonNullableMap(params)) {
      return accountService.findRoute(params.initiator, params.signatory, params.accounts, params.chain);
    }
    return [];
  });
}
