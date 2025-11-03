import { useUnit } from 'effector-react';

import { type Referendum, useReferendumMeta } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

export const useReferendumMetadata = (referendum: Referendum | null) => {
  const provider = useUnit(governanceMetaProvider.$metaProvider);
  const api = useFellowshipApi();
  const { data: metas, pending } = useReferendumMeta({ palletType: 'fellowship', api, provider: provider?.type });

  return {
    data: referendum ? (metas[referendum.id] ?? null) : null,
    pending,
  };
};
