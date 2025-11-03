import { memo, useState } from 'react';

import { type Transaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, trackService, useMaxRank } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { useFellowshipAccount, useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { tasksService } from '@/features/fellowship-tasks';
import { useIsVotingDisabled } from '../hooks/useIsVotingDisabled';
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
  const api = useFellowshipApi();

  const { data: account } = useFellowshipAccount();
  const { data: maxRank } = useMaxRank({ palletType: 'fellowship', api });
  const { data: currentMember } = useFellowshipMember();

  const { data: referendumVote } = useReferendumVote(referendum?.id);
  const canAddToBasket = nonNullable(account) && basketUtils.isBasketAvailableForAccount(account);

  const isDisabled = useIsVotingDisabled(referendum);

  if (nullable(currentMember) || nullable(maxRank)) return null;

  const memberVoteWeight = trackService.getVoteWeight({
    pallet: 'fellowship',
    rank: currentMember.rank,
    maxRank,
    track: referendum.track,
  });

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

  const totalReferendumVotes = referendum.tally.ayes + referendum.tally.nays;
  const userVotesImpact =
    tasksService.getReferendumUserImportanceScore(
      totalReferendumVotes,
      referendumVote?.decision ? memberVoteWeight * 2 : memberVoteWeight,
    ) * 100;

  return (
    <Box gap={1}>
      <Box direction="row" gap={1} horizontalAlign="center">
        <VotingButtonWithTooltip
          variant="negative"
          icon="negative"
          disabled={isDisabled}
          isVoted={referendumVote?.decision === 'Nay'}
          checked={nonNullable(transaction) && !transaction.args.aye}
          votes={memberVoteWeight}
          voteImpact={userVotesImpact}
          onClick={nay}
        />
        <VotingButtonWithTooltip
          variant="positive"
          icon="positive"
          disabled={isDisabled}
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
