import { memo, useCallback, useState } from 'react';

import { type Transaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { VotingButtonWithTooltip } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, useMaxRank } from '@/domains/collectives';
import { trackService } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { useFellowshipAccount, useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { useCanVoteForReferendum } from '../hooks/useCanVoteForReferendum';
import { useMemberVoteInfo } from '../hooks/useMemberVoteInfo';
import { useReferendumVote } from '../hooks/useReferendumVote';
import { voting } from '../model/voting';

import { VotingModal } from './VotingModal';

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
};

export const VotingActions = memo(({ referendum, transaction }: Props) => {
  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  const api = useFellowshipApi();
  const { data: account } = useFellowshipAccount();
  const { data: referendumVote } = useReferendumVote(referendum);
  const { data: currentMember } = useFellowshipMember();
  const { data: maxRank } = useMaxRank({ palletType: 'fellowship', api });

  const canAddToBasket = nonNullable(account) && basketUtils.isBasketAvailableForAccount(account);

  const canVote = useCanVoteForReferendum(referendum);
  const { memberVoteWeight, userVotesImpact } = useMemberVoteInfo(referendum);

  const handleVote = useCallback(
    (vote: 'aye' | 'nay') => {
      const alreadyChainVoted =
        (vote === 'aye' && referendumVote?.decision === 'Aye') ||
        (vote === 'nay' && referendumVote?.decision === 'Nay');

      if (canAddToBasket && nonNullable(transaction) && alreadyChainVoted) {
        voting.flow.open({ vote, referendum });
        voting.removeFromBasket();
        voting.flow.close({ vote: null, referendum: null });
        return;
      }

      if (alreadyChainVoted) return;

      if (decision === vote) {
        setDecision(null);
        return;
      }

      if (canAddToBasket) {
        voting.flow.open({ vote, referendum });
        voting.saveToBasket();
        voting.flow.close({ vote: null, referendum: null });
      } else {
        setDecision(vote);
      }
    },
    [referendumVote?.decision, decision, canAddToBasket, referendum?.id, transaction],
  );

  if (!currentMember || nullable(userVotesImpact)) return null;

  const aye = () => handleVote('aye');
  const nay = () => handleVote('nay');

  const hasRequiredRank =
    nonNullable(referendum) &&
    nonNullable(maxRank) &&
    trackService.rankSatisfiesVotingThreshold(currentMember.rank, maxRank, referendum.track);

  const isCanVote = canVote && hasRequiredRank;

  return (
    <Box gap={1}>
      <Box direction="row" gap={1} horizontalAlign="center">
        <VotingButtonWithTooltip
          variant="negative"
          icon="negative"
          disabled={!isCanVote}
          isVoted={nullable(transaction) ? referendumVote?.decision === 'Nay' : false}
          checked={nonNullable(transaction) && !transaction.args.aye}
          votes={memberVoteWeight}
          voteImpact={userVotesImpact}
          onClick={nay}
        />
        <VotingButtonWithTooltip
          variant="positive"
          icon="positive"
          disabled={!isCanVote}
          isVoted={nullable(transaction) ? referendumVote?.decision === 'Aye' : false}
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
