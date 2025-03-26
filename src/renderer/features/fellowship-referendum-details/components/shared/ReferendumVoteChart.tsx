import { useGate } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { DynamicVoteChart } from '@/shared/ui-entities';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type Referendum, referendumService } from '@/domains/collectives';
import { fellowshipReferendumsDetailsFeature } from '../../model/feature';

type Props = {
  referendum: Referendum | null;
  pending: boolean;
  votes?: number | null;
  highlight?: 'Aye' | 'Nay' | null;
  voted?: 'Aye' | 'Nay';
};

export const ReferendumVoteChart = memo<Props>(({ referendum, voted, pending, votes, highlight }) => {
  useGate(fellowshipReferendumsDetailsFeature.gate);

  const { t } = useI18n();

  if (nullable(referendum)) {
    if (pending) {
      return (
        <Skeleton active fullWidth>
          <DynamicVoteChart value={0} disabled />
        </Skeleton>
      );
    } else {
      return null;
    }
  }

  if (referendumService.isCompleted(referendum)) {
    return null;
  }

  const showDiff = nonNullable(votes) && highlight;

  const total = referendum.tally.ayes + referendum.tally.nays;
  const aye =
    voted === 'Aye' && showDiff
      ? ((referendum.tally.ayes - votes) / (total - votes)) * 100
      : (referendum.tally.ayes / total) * 100;

  // if user wants to revote then votes diff for the referendum x2
  const voteDiff = showDiff && (nullable(voted) || voted === highlight ? votes : votes * 2);
  const votesImpact = voteDiff ? (voteDiff / (voted ? total : total + votes)) * 100 : 0;

  const disabled = referendum.tally.ayes === 0 && referendum.tally.nays === 0;

  const chartNode = (
    <DynamicVoteChart value={aye} disabled={disabled} votesImpact={highlight === 'Nay' ? -votesImpact : votesImpact} />
  );

  return (
    <div className="flex w-full flex-col">
      {chartNode}
      <Box direction="row" horizontalAlign="space-between">
        <HelpText className="text-text-secondary">
          {t('voteChart.nay')}: {referendum.tally.nays}
        </HelpText>
        <HelpText className="text-text-secondary">
          {t('voteChart.aye')}: {referendum.tally.ayes}
        </HelpText>
      </Box>
    </div>
  );
});
