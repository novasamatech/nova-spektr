import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type Transaction } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, trackService } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { fellowshipReferendumDetails } from '@/features/fellowship-referendum-details';
import { voting } from '../model/voting';
import { votingStatus } from '../model/votingStatus';

import { VotingButtonWithTooltip } from './VotingButtonWithTooltip';
import { VotingModal } from './VotingModal';

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
};

const { ReferendumVoteChart } = fellowshipReferendumDetails.views;

export const VotingActions = ({ referendum, transaction }: Props) => {
  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);
  const [highlight, setHighlight] = useState<'aye' | 'nay' | null>(null);

  const account = useUnit(votingStatus.$votingAccount);
  const maxRank = useUnit(votingStatus.$maxRank);
  const currentMember = useUnit(votingStatus.$currentMember);
  const canVote = useUnit(votingStatus.$canVote);
  const accountsVotes = useUnit(votingStatus.$accountsVotes);

  const referendumVote = accountsVotes.find(voting => voting.referendumId === referendum?.id);
  const canAddToBasket = nonNullable(account) && basketUtils.isBasketAvailableForAccount(account);

  const hasRequiredRank =
    nonNullable(currentMember) &&
    nonNullable(referendum) &&
    trackService.rankSatisfiesVotingThreshold(currentMember.rank, maxRank, referendum.track);

  const disabled = !canVote || !hasRequiredRank;

  const votes =
    currentMember &&
    trackService.getVoteWeight({
      pallet: 'fellowship',
      rank: currentMember.rank,
      maxRank,
      track: referendum.track,
    });

  const aye = () => {
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
      <Box direction="row" gap={0.5}>
        <VotingButtonWithTooltip
          variant="negative"
          icon="thumbDown"
          disabled={disabled}
          voted={referendumVote?.decision === 'Nay'}
          checked={nonNullable(transaction) && !transaction.args.aye}
          votes={votes}
          onClick={nay}
          onHover={e => setHighlight(e)}
        />
        <VotingButtonWithTooltip
          variant="positive"
          icon="thumbUp"
          disabled={disabled}
          voted={referendumVote?.decision === 'Aye'}
          checked={nonNullable(transaction) && transaction.args.aye}
          votes={votes}
          onClick={aye}
          onHover={e => setHighlight(e)}
        />
      </Box>
      <div className="w-[102px]">
        <ReferendumVoteChart
          referendum={referendum}
          pending={!!referendum}
          descriptionPosition="bottom"
          votes={votes}
          highlight={highlight}
        />
      </div>
      <VotingModal isOpen={nonNullable(decision)} vote={decision} onClose={() => setDecision(null)} />
    </Box>
  );
};
