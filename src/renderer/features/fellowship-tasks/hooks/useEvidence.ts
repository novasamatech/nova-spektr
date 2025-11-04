import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useEvidences } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useEvidence = (account: AccountId | null) => {
  const api = useFellowshipApi();
  const { data: evidences, pending } = useEvidences({
    palletType: 'fellowship',
    api,
    accounts: account ? [account] : null,
  });

  const evidence = useMemo(() => {
    if (nullable(account)) return null;

    return evidences.find(x => x.accountId === account) ?? null;
  }, [evidences, account]);

  return { data: evidence, pending };
};
