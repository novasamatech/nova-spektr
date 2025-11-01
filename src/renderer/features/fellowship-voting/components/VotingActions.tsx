import { useUnit } from 'effector-react';
import { memo, useCallback, useState } from 'react';

import { type Transaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { VotingButtonWithTooltip } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, trackService } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { tasksService } from '@/features/fellowship-tasks';
import { voting } from '../model/voting';
import { votingStatus } from '../model/votingStatus';

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

  const handleVote = useCallback(
    (vote: 'aye' | 'nay') => {
      const alreadyChainVoted =
        (vote === 'aye' && referendumVote?.decision === 'Aye') ||
        (vote === 'nay' && referendumVote?.decision === 'Nay');

      if (canAddToBasket && nonNullable(transaction) && alreadyChainVoted) {
        voting.flow.open({ vote });
        voting.removeFromBasket();
        voting.flow.close({ vote: null });
        votingStatus.flow.close({ referendumId: null });
        return;
      }

      if (alreadyChainVoted) return;

      if (decision === vote) {
        votingStatus.flow.close({ referendumId: null });
        setDecision(null);
        return;
      }

      votingStatus.flow.open({ referendumId: referendum?.id });

      if (canAddToBasket) {
        voting.flow.open({ vote });
        voting.saveToBasket();
        voting.flow.close({ vote: null });
      } else {
        setDecision(vote);
      }
    },
    [referendumVote?.decision, decision, canAddToBasket, referendum?.id],
  );

  const aye = () => handleVote('aye');
  const nay = () => handleVote('nay');

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
          isVoted={nullable(transaction) ? referendumVote?.decision === 'Nay' : false}
          checked={nonNullable(transaction) && !transaction.args.aye}
          votes={memberVoteWeight}
          voteImpact={userVotesImpact}
          onClick={nay}
        />
        <VotingButtonWithTooltip
          variant="positive"
          icon="positive"
          disabled={disabled}
          isVoted={nullable(transaction) ? referendumVote?.decision === 'Aye' : false}
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
