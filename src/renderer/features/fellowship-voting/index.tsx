import { useUnit } from 'effector-react';
import { useState } from 'react';

import { useFlow } from '@/shared/effector';
import { nonNullable } from '@/shared/lib/utils';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { additionalInfoSlot, referendumActionsSlot } from '@/features/fellowship-referendum-details';
import { taskVotingActionSlot } from '@/features/fellowship-tasks';

import { VotingButtons } from './components/VotingButtons';
import { VotingConfirmation } from './components/VotingConfirmation';
import { VotingModal } from './components/VotingModal';
import { WalletVotingInfo } from './components/WalletVotingInfo';
import { fellowshipVotingFeature } from './model/feature';
import { fellowship } from './model/fellowship';
import { voting } from './model/voting';
import { votingStatus } from './model/votingStatus';

export { fellowshipVotingFeature, VotingConfirmation, votingStatus, fellowship };

fellowshipVotingFeature.inject(taskVotingActionSlot, ({ referendumId }) => {
  useFlow(votingStatus.flow, { referendumId });
  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);
  const canVote = useUnit(votingStatus.$canVote);
  const account = useUnit(votingStatus.$votingAccount);
  const hasRequiredRank = useUnit(votingStatus.$hasRequiredRank);
  const disabled = !canVote || !hasRequiredRank;

  const canAddToBasket = nonNullable(account) && basketUtils.isBasketAvailableForAccount(account);

  const aye = () => {
    if (canAddToBasket) {
      voting.flow.open({ vote: 'aye' });
      voting.saveToBasket();
      voting.flow.close({ vote: null });
    } else {
      setDecision('aye');
    }
  };

  const nay = () => {
    if (canAddToBasket) {
      voting.flow.open({ vote: 'nay' });
      voting.saveToBasket();
      voting.flow.close({ vote: null });
    } else {
      setDecision('nay');
    }
  };

  return (
    <Box direction="row" gap={3}>
      <FilledIconButton variant="negative" icon="thumbDown" disabled={disabled} onClick={nay} />
      <FilledIconButton variant="positive" icon="thumbUp" disabled={disabled} onClick={aye} />
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
