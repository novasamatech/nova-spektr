import { type DelegateInfo } from '@/shared/api/governance';
import { type AccountVote, type Address, type Asset, type Identity } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { VotedByDelegates } from './VotedByDelegates';
import { VotedCombined } from './VotedCombined';

type Props = {
  asset: Asset;
  identity: Record<Address, Identity>;
  delegates: DelegateInfo[];
  castingVotes: {
    voter: AccountId;
    vote: AccountVote;
  }[];
};

export const VotedBy = ({ asset, identity, castingVotes, delegates }: Props) => {
  // Delegates only
  if (delegates.length > 0 && !castingVotes.length) {
    return <VotedByDelegates asset={asset} identity={identity} delegates={delegates} />;
  }

  // Voters and delegate if presented
  if (castingVotes.length > 0) {
    return <VotedCombined asset={asset} castingVotes={castingVotes} delegates={delegates} />;
  }

  // No delegate and No votes
  return null;
};
