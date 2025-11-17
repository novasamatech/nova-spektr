import { type Chain } from '@/shared/core';
import { RankedAccount } from '@/shared/ui-entities';
import { type CoreMember } from '@/domains/collectives';
import { type AccountIdentity, identityService } from '@/domains/network';

type Props = {
  member: CoreMember;
  identity: AccountIdentity | null;
  chain: Chain;
};

export const Member = ({ member, identity, chain }: Props) => {
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
