import { additionalInfoSlot, referendumActionsSlot } from '@/features/fellowship-referendum-details';
import { taskVotingActionSlot } from '@/features/fellowship-tasks';

import { VotingActions } from './components/VotingActions';
import { VotingButtons } from './components/VotingButtons';
import { VotingConfirmation } from './components/VotingConfirmation';
import { WalletVotingInfo } from './components/WalletVotingInfo';
import { fellowshipVotingFeature } from './model/feature';
import { fellowship } from './model/fellowship';
import { votingStatus } from './model/votingStatus';

export { fellowshipVotingFeature, VotingConfirmation, votingStatus, fellowship };

fellowshipVotingFeature.inject(taskVotingActionSlot, ({ referendum, transaction }) => {
  return <VotingActions referendum={referendum} transaction={transaction} />;
});

fellowshipVotingFeature.inject(additionalInfoSlot, ({ referendumId }) => {
  return <WalletVotingInfo referendumId={referendumId} />;
});

fellowshipVotingFeature.inject(referendumActionsSlot, ({ referendumId }) => {
  return <VotingButtons referendumId={referendumId} />;
});
