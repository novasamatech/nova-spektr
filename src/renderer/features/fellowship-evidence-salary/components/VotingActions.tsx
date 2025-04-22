import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { DynamicVoteChart } from '@/shared/ui-entities';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';

import { EvidenceVotingModal } from './EvidenceVotingModal';
import { PeriodEndTimer } from './PeriodEndTimer';

type Props = {
  evidence: Evidence;
  endBlock: number | null;
  variant: 'large' | 'small';
};

export const VotingActions = memo(({ evidence, endBlock, variant }: Props) => {
  const { t } = useI18n();

  const buttonNodes = (
    <Box direction="row" gap={1}>
      <EvidenceVotingModal evidence={evidence} aye={false}>
        <FilledIconButton variant="negative" icon="thumbDown" />
      </EvidenceVotingModal>

      <EvidenceVotingModal evidence={evidence} aye={true}>
        <FilledIconButton variant="positive" icon="thumbUp" />
      </EvidenceVotingModal>
    </Box>
  );

  const chartNode = <DynamicVoteChart disabled value={50} hasVotes />;

  if (variant === 'large') {
    return (
      <Box direction="row" verticalAlign="center" gap={8}>
        <Box width="280px">{chartNode}</Box>
        {buttonNodes}
      </Box>
    );
  }

  if (variant === 'small') {
    return (
      <Box verticalAlign="center" horizontalAlign="flex-end" gap={2} width="102px">
        {nonNullable(endBlock) && <PeriodEndTimer endBlock={endBlock} shortDateFormat />}
        {buttonNodes}
        <Box gap={1.5} width="100%">
          {chartNode}
          <Box direction="row" horizontalAlign="space-between">
            <FootnoteText className="text-text-secondary">
              {t('voteChart.nay')}: {0}
            </FootnoteText>
            <FootnoteText className="text-text-secondary">
              {t('voteChart.aye')}: {0}
            </FootnoteText>
          </Box>
        </Box>
      </Box>
    );
  }

  return null;
});
