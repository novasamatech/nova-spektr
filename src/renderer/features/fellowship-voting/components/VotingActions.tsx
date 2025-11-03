import { memo, useState } from 'react';

import { type Transaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { useFellowshipAccount } from '@/aggregates/fellowship-member';
import { useCanVoteForReferendum } from '../hooks/useCanVoteForReferendum';
import { useMemberVoteInfo } from '../hooks/useMemberVoteInfo';
import { useReferendumVote } from '../hooks/useReferendumVote';
import { voting } from '../model/voting';
import { votingStatus } from '../model/votingStatus';

import { VotingButtonWithTooltip } from './VotingButtonWithTooltip';
import { VotingModal } from './VotingModal';

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
};

export const VotingActions = memo(({ referendum, transaction }: Props) => {
  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  const { data: account } = useFellowshipAccount();
  const { data: referendumVote } = useReferendumVote(referendum?.id);

  const canAddToBasket = nonNullable(account) && basketUtils.isBasketAvailableForAccount(account);

  const canVote = useCanVoteForReferendum(referendum);
  const { memberVoteWeight, userVotesImpact } = useMemberVoteInfo(referendum);

  if (nullable(userVotesImpact)) return null;

  const aye = () => {
    if (referendumVote?.decision === 'Aye') return;

    if (decision === 'aye') {
      votingStatus.flow.close({ referendumId: null });
      setDecision(null);
      return;
    }

    votingStatus.flow.open({ referendumId: referendum?.id });

    if (canAddToBasket) {
      voting.flow.open({ vote: 'aye' });
      voting.saveToBasket();
      voting.flow.close({ vote: null });
    } else {
      setDecision('aye');
    }
  };

  const nay = () => {
    if (referendumVote?.decision === 'Nay') return;

    if (decision === 'nay') {
      votingStatus.flow.close({ referendumId: null });
      setDecision(null);
      return;
    }

    votingStatus.flow.open({ referendumId: referendum?.id });

    if (canAddToBasket) {
      voting.flow.open({ vote: 'nay' });
      voting.saveToBasket();
      voting.flow.close({ vote: null });
    } else {
      setDecision('nay');
    }
  };

  return (
    <Box gap={1}>
      <Box direction="row" gap={1} horizontalAlign="center">
        <VotingButtonWithTooltip
          variant="negative"
          icon="negative"
          disabled={!canVote}
          isVoted={referendumVote?.decision === 'Nay'}
          checked={nonNullable(transaction) && !transaction.args.aye}
          votes={memberVoteWeight}
          voteImpact={userVotesImpact}
          onClick={nay}
        />
        <VotingButtonWithTooltip
          variant="positive"
          icon="positive"
          disabled={!canVote}
          isVoted={referendumVote?.decision === 'Aye'}
          checked={nonNullable(transaction) && transaction.args.aye}
          votes={memberVoteWeight}
          voteImpact={userVotesImpact}
          onClick={aye}
        />
      </Box>
      {decision ? (
        <VotingModal
          isOpen={nonNullable(decision)}
          vote={decision}
          referendum={referendum}
          onClose={() => setDecision(null)}
        />
      ) : null}
    </Box>
  );
});
