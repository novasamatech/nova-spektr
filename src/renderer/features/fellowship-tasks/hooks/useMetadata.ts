import { useUnit } from 'effector-react';

import { nonNullable } from '@/shared/lib/utils';
import { type Referendum, useReferendumMeta } from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

export const useMetadata = (referendum: Referendum | null) => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const provider = useUnit(governanceMetaProvider.$metaProvider);
  const { data: metas, pending } = useReferendumMeta({
    palletType: 'fellowship',
    api,
    chain,
    provider: provider?.type,
  });

  const meta = nonNullable(referendum) ? (metas[referendum.id] ?? null) : null;

  return { data: meta, pending };
};
