import { attach, scopeBind } from 'effector';

import { type ChainId } from '@/shared/core';
import { assert, nullable } from '@/shared/lib/utils';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';
import { accountService } from '../account/service';

import { POLKADOT_PEOPLE_CHAIN_ID } from './constants';
import { identitySigngularResource } from './resource';

type RequestParams = {
  accounts: AccountId[];
  chainId?: ChainId;
};

const requestFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  effect({ chains, apis }, { accounts, chainId = POLKADOT_PEOPLE_CHAIN_ID }: RequestParams) {
    const bound = scopeBind(identitySigngularResource.request, { safe: true });

    let identityChainId = chains[chainId]?.additional?.identityChain ?? chainId;
    let identityChain = chains[identityChainId];
    let api = apis[identityChainId];

    if (nullable(api) || !identityPallet.supportedOn(api)) {
      identityChainId = POLKADOT_PEOPLE_CHAIN_ID;
      api = apis[identityChainId];
      identityChain = chains[identityChainId];
    }

    assert(identityChain, `Chain ${identityChainId} not found`);
    assert(api, `Api for chain ${identityChainId} not found`);

    const supportedAccounts = accounts.filter(id => accountService.isAccountSchemeMatchChain(id, identityChain));

    return bound({ accounts: supportedAccounts, chainId, api });
  },
});

export const identity = {
  $list: identitySigngularResource.$cache,
  resource: identitySigngularResource,
  request: requestFx,
};
