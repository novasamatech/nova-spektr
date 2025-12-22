import { type Chain } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { AccountExplorers, RankedAccount } from '@/shared/ui-entities';
import { type Vote as VoteType, memberService, useMember } from '@/domains/collectives';
import { useFellowshipApi, useFellowshipIdentity } from '@/aggregates/fellowship-network';

type Props = {
  item: VoteType;
  chain: Chain;
};

export const Vote = ({ item, chain }: Props) => {
  const { data: identity } = useFellowshipIdentity(item.accountId);

  const api = useFellowshipApi();
  const { data: member } = useMember({ palletType: 'fellowship', api, accountId: item.accountId });

  return (
    <div className="flex items-center justify-between rounded-md pe-2 text-text-secondary hover:bg-action-background-hover hover:text-text-primary">
      <div className="shrink-0 grow">
        <RankedAccount
          rank={member?.rank || 0}
          isActive={nonNullable(member) && memberService.isCoreMember(member) ? member.isActive : false}
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
