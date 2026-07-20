import { type Store, combine } from 'effector';

import { type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';

export type InitiatorSelection = {
  walletId: number;
  address: string;
};

type Params = {
  chain: Store<Chain | null>;
  accounts: Store<AnyAccount[]>;
  selection: Store<InitiatorSelection | null>;
};

/**
 * Route-building flows whose initiator comes from a picker outside
 * effector-forms must derive it from the explicit user selection via this store
 * — never from "first account of the wallet", which breaks key-set wallets
 * holding several keys on one chain.
 */
export const createSelectedInitiatorStore = ({ chain, accounts, selection }: Params) => {
  return combine({ chain, accounts, selection }, ({ chain, accounts, selection }) => {
    if (nullable(chain) || nullable(selection)) return null;
    return accountService.resolveSelectedAccount(accounts, { ...selection, chain });
  });
};
