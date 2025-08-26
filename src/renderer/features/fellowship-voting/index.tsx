import { useUnit } from 'effector-react';

import { nonNullable } from '@/shared/lib/utils';
import { referendumService } from '@/domains/collectives';
import { referendumActionsSlot } from '@/features/fellowship-referendum-details';
import { referendumVotingTaskActionSlot } from '@/features/fellowship-tasks';

import { ReferendumEndTimer } from './components/ReferendumEndTimer';
import { VotingActions } from './components/VotingActions';
import { VotingButtons } from './components/VotingButtons';
import { VotingButtonsCompleted } from './components/VotingButtonsCompleted';
import { VotingConfirmation } from './components/VotingConfirmation';
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

fellowshipVotingFeature.inject(referendumActionsSlot, ({ evidence, referendum }) => {
  const voting = useUnit(votingStatus.$referendumVoting);

  if (nonNullable(referendum) && referendumService.isCompleted(referendum) && nonNullable(voting)) {
    return <VotingButtonsCompleted referendum={referendum} evidence={evidence} />;
  }

  return <VotingButtons referendum={referendum} evidence={evidence} />;
});
