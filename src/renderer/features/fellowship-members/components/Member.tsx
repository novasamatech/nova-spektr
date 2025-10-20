import { useStoreMap } from 'effector-react';

import { type Chain } from '@/shared/core';
import { RankedAccount } from '@/shared/ui-entities';
import { type CoreMember } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { identityModel } from '../model/identity';

type Props = {
  member: CoreMember;
  chain: Chain;
};

export const Member = ({ member, chain }: Props) => {
  const identity = useStoreMap({
    store: identityModel.$identity,
    keys: [member.accountId],
    fn: (identity, [accountId]) => identity[accountId] ?? null,
  });

  return (
    <div className="rounded-md text-text-secondary hover:bg-action-background-hover hover:text-text-primary">
      <RankedAccount
        chain={chain}
        rank={member.rank}
        name={identity ? identityService.getFullName(identity) : undefined}
        isActive={member.isActive}
        accountId={member.accountId}
      />
    </div>
  );
};
