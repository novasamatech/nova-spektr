import { useStoreMap } from 'effector-react';

import { type Chain } from '@/shared/core';
import { RankedAccount } from '@/shared/ui-entities';
import { type CoreMember } from '@/domains/collectives';
import { identityService } from '@/domains/network';
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
    <div className="text-text-secondary hover:bg-action-background-hover hover:text-text-primary rounded-md">
      <RankedAccount
        chain={chain}
        rank={item.rank}
        name={identity ? identityService.getFullName(identity) : undefined}
        isActive={item.isActive}
        accountId={item.accountId}
      />
    </div>
  );
};
