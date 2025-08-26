import { useStoreMap } from 'effector-react';

import { type Chain } from '@/shared/core';
import { AccountExplorers, RankedAccount } from '@/shared/ui-entities';
import { type CoreMember, type Vote as VoteType } from '@/domains/collectives';
import { identityModel } from '../model/identity';
import { membersModel } from '../model/members';

type Props = {
  item: VoteType;
  chain: Chain;
};

export const Vote = ({ item, chain }: Props) => {
  const identity = useStoreMap({
    store: identityModel.$identity,
    keys: [item.accountId],
    fn: (identity, [accountId]) => identity[accountId] ?? null,
  });

  const member = useStoreMap({
    store: membersModel.$members,
    keys: [item.accountId],
    fn: (members, [accountId]) => members[accountId] ?? null,
  });

  return (
    <div className="flex items-center justify-between rounded-md pe-2 text-text-secondary hover:bg-action-background-hover hover:text-text-primary">
      <div className="shrink-0 grow">
        <RankedAccount
          rank={member?.rank || 0}
          isActive={(member as CoreMember)?.isActive || false}
          name={identity?.name}
          accountId={item.accountId}
          chain={chain}
          hideExplorers
        />
      </div>
      <AccountExplorers accountId={item.accountId} chain={chain} />
    </div>
  );
};
