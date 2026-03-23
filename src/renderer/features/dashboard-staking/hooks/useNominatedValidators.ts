import { useMemo } from 'react';

import { type Asset, type Chain, type ChainId } from '@/shared/core';
import { type Validator } from '@/shared/core/types/validator';
import { getRelaychainAsset } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountIdentity, useIdentities } from '@/domains/network';
import { useActiveEra, useNominators, useValidators } from '@/domains/staking';
import { useApi, useChain } from '@/entities/network';

type NominatedValidatorsResult = {
  elected: Validator[];
  notElected: Validator[];
  identities: Record<AccountId, AccountIdentity>;
  chain: Chain | null;
  asset: Asset | undefined;
  pending: boolean;
};

export const useNominatedValidators = (chainId: ChainId, stash: AccountId | null): NominatedValidatorsResult => {
  const api = useApi(chainId);
  const chain = useChain(chainId);
  const { data: era } = useActiveEra({ chainId, api });
  const asset = chain ? getRelaychainAsset(chain.assets) : undefined;

  const { data: nominatedMap, pending: nominatorsPending } = useNominators({ chainId, api, stash });
  const { data: eraValidatorsMap, pending: validatorsPending } = useValidators({ chainId, api, era });

  const { elected, notElected } = useMemo(() => {
    const nominatedIds = Object.keys(nominatedMap) as AccountId[];
    if (nominatedIds.length === 0) return { elected: [], notElected: [] };

    const electedList: Validator[] = [];
    const notElectedList: Validator[] = [];

    for (const id of nominatedIds) {
      const fullValidator = eraValidatorsMap[id];
      if (fullValidator) {
        electedList.push(fullValidator);
      } else {
        notElectedList.push({ accountId: id } as Validator);
      }
    }

    return { elected: electedList, notElected: notElectedList };
  }, [nominatedMap, eraValidatorsMap]);

  const allAccountIds = [...elected, ...notElected].map((v) => v.accountId);
  const identities = useIdentities(allAccountIds, chainId);

  const pending = nominatorsPending || validatorsPending;

  return { elected, notElected, identities, chain, asset, pending };
};
