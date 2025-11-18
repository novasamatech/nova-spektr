import { useI18n } from '@/shared/i18n';
import { SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { Card, referendumAdditionalInfoSlot } from '@/features/fellowship-referendum-details';

import { VotingHistory } from './components/VotingHistory';
import { VotingSummary } from './components/VotingSummary';
import { fellowshipVotingHistoryFeature } from './feature';

export { fellowshipVotingHistoryFeature };

fellowshipVotingHistoryFeature.inject(referendumAdditionalInfoSlot, ({ referendum }) => {
  const { t } = useI18n();

  return (
    <Card>
      <Box padding={6} gap={4}>
        <Box direction="row" verticalAlign="center" horizontalAlign="space-between">
          <SmallTitleText>{t('fellowship.voting.summary')}</SmallTitleText>

          <VotingHistory referendumId={referendum.id} />
        </Box>

        <VotingSummary referendum={referendum} />
      </Box>
    </Card>
  );
});
