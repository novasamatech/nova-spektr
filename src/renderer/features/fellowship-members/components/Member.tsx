import { type Chain } from '@/shared/core';
import { RankedAccount } from '@/shared/ui-entities';
import { type CoreMember } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { useIdentity } from '../hooks/useIdentity';

type Props = {
  member: CoreMember;
  chain: Chain;
};

export const Member = ({ member, chain }: Props) => {
  const { data: identity } = useIdentity(member.accountId, chain.chainId);

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
