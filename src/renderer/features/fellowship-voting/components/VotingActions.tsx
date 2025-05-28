import { useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { type Transaction } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, trackService } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { tasksService } from '@/features/fellowship-tasks';
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

  const account = useUnit(votingStatus.$votingAccount);
  const maxRank = useUnit(votingStatus.$maxRank);
  const currentMember = useUnit(votingStatus.$currentMember);
  const canVote = useUnit(votingStatus.$canVote);
  const accountsVotes = useUnit(votingStatus.$accountsVotes);

  const referendumVote = accountsVotes.find(voting => voting.referendumId === referendum?.id);
  const canAddToBasket = nonNullable(account) && basketUtils.isBasketAvailableForAccount(account);

  if (!currentMember) return null;

  const hasRequiredRank =
    nonNullable(referendum) && trackService.rankSatisfiesVotingThreshold(currentMember.rank, maxRank, referendum.track);

  const disabled = !canVote || !hasRequiredRank;

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
          disabled={disabled}
          isVoted={referendumVote?.decision === 'Nay'}
          checked={nonNullable(transaction) && !transaction.args.aye}
          votes={memberVoteWeight}
          voteImpact={userVotesImpact}
          onClick={nay}
        />
        <VotingButtonWithTooltip
          variant="positive"
          icon="positive"
          disabled={disabled}
          isVoted={referendumVote?.decision === 'Aye'}
          checked={nonNullable(transaction) && transaction.args.aye}
          votes={memberVoteWeight}
          voteImpact={userVotesImpact}
          onClick={aye}
        />
      </Box>
      {decision ? (
        <VotingModal isOpen={nonNullable(decision)} vote={decision} onClose={() => setDecision(null)} />
      ) : null}
    </Box>
  );
});
