import { combine, createEvent, restore } from 'effector';

import { type ChainId } from '@/shared/core';
import { polkadotChainId } from '@/shared/mocks';
import { accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

const selectChain = createEvent<ChainId>();
const $selectedChainId = restore(selectChain, polkadotChainId);

const $simpleAccounts = accounts.$list.map((accounts) =>
  accounts.filter((account) => {
    return (
      !accountUtils.isProxiedAccount(account) && !accountUtils.isMultisigAccount && !accountUtils.isWatchOnlyAccount
    );
  }),
);

const $availableChains = combine(
  {
    chains: networkModel.$chains.map((chains) => Object.values(chains)),
    accounts: $simpleAccounts,
  },
  ({ chains, accounts }) => {
    if (!accounts) return chains;

    return chains.filter((chain) =>
      accounts.some((account) => accountService.isAccountAvailableOnChain(account, chain)),
    );
  },
);

export const callDataModel = {
  $availableChains,
  $selectedChainId,
  events: {
    selectChain,
  },
};
