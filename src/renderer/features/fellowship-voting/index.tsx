import {
  referendumActionsSlot,
  referendumAdditionalHighPriorityInfoSlot,
} from '@/features/fellowship-referendum-details';
import { referendumVotingTaskActionSlot } from '@/features/fellowship-tasks';

import { ReferendumEndTimer } from './components/ReferendumEndTimer';
import { VotingActions } from './components/VotingActions';
import { VotingButtons } from './components/VotingButtons';
import { VotingConfirmation } from './components/VotingConfirmation';
import { WalletVotingInfo } from './components/WalletVotingInfo';
import { fellowshipVotingFeature } from './model/feature';
import { fellowship } from './model/fellowship';
import { votingStatus } from './model/votingStatus';

export { fellowshipVotingFeature, VotingConfirmation, votingStatus, fellowship };

fellowshipVotingFeature.inject(referendumVotingTaskActionSlot, ({ referendum, transaction, dateThresholds }) => {
  return (
    <>
      <ReferendumEndTimer endBlock={referendum.ends} dateThresholds={dateThresholds} shortDateFormat />
      <VotingActions referendum={referendum} transaction={transaction} />
    </>
  );
});

fellowshipVotingFeature.inject(referendumAdditionalHighPriorityInfoSlot, ({ referendumId }) => {
  return <WalletVotingInfo referendumId={referendumId} />;
});

fellowshipVotingFeature.inject(referendumActionsSlot, ({ evidence, referendum }) => {
  return <VotingButtons referendum={referendum} evidence={evidence} />;
});
