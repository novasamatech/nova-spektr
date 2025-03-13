import { type DelegateInfo } from '@/shared/api/governance';
import { type AccountVote, type Address, type Asset, type Identity } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { VotedByDelegates } from './VotedByDelegates';
import { VotedCombined } from './VotedCombined';

type Props = {
  variant: 'columns' | 'rows';
  asset: Asset;
  identity: Record<Address, Identity>;
  delegates: DelegateInfo[];
  conviction?: boolean;
  castingVotes: {
    voter: AccountId;
    vote: AccountVote;
  }[];
};

export const VotedBy = ({ variant, asset, identity, castingVotes, delegates, conviction }: Props) => {
  // Delegates only
  if (delegates.length > 0 && !castingVotes.length) {
    return <VotedByDelegates asset={asset} identity={identity} delegates={delegates} conviction={conviction} />;
  }

  // Voters and delegate if presented
  if (castingVotes.length > 0) {
    return (
      <VotedCombined
        variant={variant}
        asset={asset}
        castingVotes={castingVotes}
        delegates={delegates}
        conviction={conviction}
      />
    );
  }

  // No delegate and No votes
  return null;
};
