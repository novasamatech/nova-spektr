import { useUnit } from 'effector-react';
import { useState } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { Box } from '@/shared/ui-kit';
import { trackService } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import {
  additionalInfoSlot,
  fellowshipReferendumDetails,
  referendumActionsSlot,
} from '@/features/fellowship-referendum-details';
import { taskVotingActionSlot } from '@/features/fellowship-tasks';

import { VotingButtonWithTooltip } from './components/VotingButtonWithTooltip';
import { VotingButtons } from './components/VotingButtons';
import { VotingConfirmation } from './components/VotingConfirmation';
import { VotingModal } from './components/VotingModal';
import { WalletVotingInfo } from './components/WalletVotingInfo';
import { fellowshipVotingFeature } from './model/feature';
import { fellowship } from './model/fellowship';
import { voting } from './model/voting';
import { votingStatus } from './model/votingStatus';

export { fellowshipVotingFeature, VotingConfirmation, votingStatus, fellowship };

const { ReferendumVoteChart } = fellowshipReferendumDetails.views;

fellowshipVotingFeature.inject(taskVotingActionSlot, ({ referendum, transaction }) => {
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
});

fellowshipVotingFeature.inject(additionalInfoSlot, ({ referendumId }) => {
  return <WalletVotingInfo referendumId={referendumId} />;
});

fellowshipVotingFeature.inject(referendumActionsSlot, ({ referendumId }) => {
  return <VotingButtons referendumId={referendumId} />;
});
