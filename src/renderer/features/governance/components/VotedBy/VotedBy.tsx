import { type DelegateInfo } from '@/shared/api/governance';
import { type AccountVote, type Asset, type Chain, type Identity } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { VotedByAccounts } from './VotedByAccounts';
import { VotedByDelegates } from './VotedByDelegates';
import { VotedCombined } from './VotedCombined';

type Props = {
  direction: 'column' | 'row';
  chain: Chain;
  asset: Asset;
  identity: Record<AccountId, Identity>;
  delegates: DelegateInfo[];
  multiplier?: boolean;
  castingVotes: {
    voter: AccountId;
    vote: AccountVote;
  }[];
};

export const VotedBy = ({ direction, chain, asset, identity, castingVotes, delegates, multiplier }: Props) => {
  const hasDelegates = delegates.length > 0;
  const hasCastingVotes = castingVotes.length > 0;

  // Delegates only
  if (hasDelegates && !hasCastingVotes) {
    return (
      <VotedByDelegates chain={chain} asset={asset} identity={identity} delegates={delegates} multiplier={multiplier} />
    );
  }

  // Accounts only
  if (!hasDelegates && hasCastingVotes) {
    return <VotedByAccounts asset={asset} castingVotes={castingVotes} multiplier={multiplier} />;
  }

  // Delegates and Accounts
  if (hasDelegates && hasCastingVotes) {
    return (
      <VotedCombined
        direction={direction}
        chain={chain}
        asset={asset}
        castingVotes={castingVotes}
        identity={identity}
        delegates={delegates}
        multiplier={multiplier}
      />
    );
  }

  return null;
};
