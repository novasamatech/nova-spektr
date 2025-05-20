import { useI18n } from '@/shared/i18n';
import { SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import {
  Card,
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
  const { t } = useI18n();
  return (
    <Card>
      <Box padding={6} gap={6}>
        <SmallTitleText>{t('fellowship.tasks.titles.votingTitle')}</SmallTitleText>
        <VotingButtons referendum={referendum} evidence={evidence} />
      </Box>
    </Card>
  );
});
