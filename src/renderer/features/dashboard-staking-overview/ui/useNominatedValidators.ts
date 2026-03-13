import { useEffect, useRef, useState } from 'react';

import { type Asset, type Chain, type ChainId } from '@/shared/core';
import { type Validator } from '@/shared/core/types/validator';
import { getRelaychainAsset } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountIdentity, useIdentities } from '@/domains/network';
import { useApi, useChain } from '@/entities/network';
import { validatorsService } from '@/entities/staking';

import { useActiveEra } from './useActiveEra';

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
  const era = useActiveEra(api);
  const asset = chain ? getRelaychainAsset(chain.assets) : undefined;

  const [elected, setElected] = useState<Validator[]>([]);
  const [notElected, setNotElected] = useState<Validator[]>([]);
  const [pending, setPending] = useState(false);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!api || !stash || era === undefined) {
      setElected([]);
      setNotElected([]);
      setPending(false);

      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setPending(true);

    Promise.all([validatorsService.getNominators(api, stash), validatorsService.getValidatorsList(api, era)]).then(
      ([nominatedMap, eraValidatorsMap]) => {
        if (currentFetchId !== fetchIdRef.current) return;

        const nominatedIds = Object.keys(nominatedMap) as AccountId[];
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

        setElected(electedList);
        setNotElected(notElectedList);
        setPending(false);
      },
    );
  }, [api, stash, era]);

  const allAccountIds = [...elected, ...notElected].map((v) => v.accountId);
  const identities = useIdentities(allAccountIds, chainId);

  return { elected, notElected, identities, chain, asset, pending };
};
