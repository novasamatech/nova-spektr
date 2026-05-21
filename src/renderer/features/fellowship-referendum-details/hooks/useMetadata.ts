import { useUnit } from 'effector-react';

import { type Referendum, useReferendumMeta } from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

export const useMetadata = (referendum: Referendum | null) => {
  const provider = useUnit(governanceMetaProvider.$metaProvider);
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: metas, pending } = useReferendumMeta({
    palletType: 'fellowship',
    api,
    chain,
    provider: provider?.type,
  });

  return {
    data: referendum ? (metas[referendum.id] ?? null) : null,
    pending,
  };
};
