import { useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { AccountExplorers, RankedAccount } from '@/shared/ui-entities';
import { type CoreMember, type Vote as VoteType, useMembers } from '@/domains/collectives';
import { useIdentities } from '@/domains/network';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

type Props = {
  item: VoteType;
  chain: Chain;
};

export const Vote = ({ item, chain }: Props) => {
  const { data: identities } = useIdentities([item.accountId], chain?.chainId);

  const identity = identities[item.accountId];

  const api = useFellowshipApi();
  const { data: members } = useMembers({ palletType: 'fellowship', api });

  const member = useMemo(() => members.find(m => m.accountId === item.accountId) ?? null, [members, item.accountId]);

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
