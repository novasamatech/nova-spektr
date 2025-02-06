import { useUnit } from 'effector-react';
import { useState } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { additionalInfoSlot, referendumActionsSlot } from '@/features/fellowship-referendum-details';
import { taskVotingActionSlot } from '@/features/fellowship-tasks';

import { VotingButtons } from './components/VotingButtons';
import { VotingConfirmation } from './components/VotingConfirmation';
import { VotingModal } from './components/VotingModal';
import { WalletVotingInfo } from './components/WalletVotingInfo';
import { fellowshipVotingFeature } from './model/feature';
import { votingStatusModel } from './model/votingStatus';

export { fellowshipVotingFeature };

export const fellowshipVotingF = {
  views: {
    VotingModal,
    VotingConfirmation,
  },
};

fellowshipVotingFeature.inject(taskVotingActionSlot, ({ referendumId }) => {
  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);
  const canVote = useUnit(votingStatusModel.$canVote);
  const hasRequiredRank = useUnit(votingStatusModel.$hasRequiredRank);
  const disabled = !canVote || !hasRequiredRank;

  return (
    <Box direction="row" gap={3}>
      <FilledIconButton variant="negative" icon="thumbDown" disabled={disabled} onClick={() => setDecision('nay')} />
      <FilledIconButton variant="positive" icon="thumbUp" disabled={disabled} onClick={() => setDecision('aye')} />
      <VotingModal
        referendumId={referendumId}
        isOpen={nonNullable(decision)}
        vote={decision}
        onClose={() => setDecision(null)}
      />
    </Box>
  );
});

fellowshipVotingFeature.inject(additionalInfoSlot, ({ referendumId }) => {
  return <WalletVotingInfo referendumId={referendumId} />;
});

fellowshipVotingFeature.inject(referendumActionsSlot, ({ referendumId }) => {
  return <VotingButtons referendumId={referendumId} />;
});
