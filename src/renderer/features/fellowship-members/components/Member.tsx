import { useStoreMap } from 'effector-react';

import { type Chain } from '@/shared/core';
import { RankedAccount } from '@/shared/ui-entities';
import { type CoreMember } from '@/domains/collectives';
import { identityModel } from '../model/identity';

type Props = {
  item: CoreMember;
  chain: Chain;
};

export const Member = ({ item, chain }: Props) => {
  const identity = useStoreMap({
    store: identityModel.$identity,
    keys: [item.accountId],
    fn: (identity, [accountId]) => identity[accountId] ?? null,
  });

  return (
    <div className="rounded-md text-text-secondary hover:bg-action-background-hover hover:text-text-primary">
      <RankedAccount
        chain={chain}
        rank={item.rank}
        name={identity?.name}
        isActive={item.isActive}
        accountId={item.accountId}
      />
    </div>
  );
};
