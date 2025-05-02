import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { ButtonCard } from '@/shared/ui';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';

import { EvidenceVotingModal } from './EvidenceVotingModal';
import { PeriodEndTimer } from './PeriodEndTimer';

type Props = {
  evidence: Evidence;
  endBlock: number | null;
  variant: 'large' | 'small';
  disabled: boolean;
};

export const VotingActions = memo(({ evidence, endBlock, variant, disabled }: Props) => {
  const { t } = useI18n();

  const buttonNodes = (
    <Box direction="row" gap={1}>
      <EvidenceVotingModal evidence={evidence} aye={false}>
        <FilledIconButton variant="negative" icon="thumbDown" disabled={disabled} />
      </EvidenceVotingModal>

      <EvidenceVotingModal evidence={evidence} aye={true}>
        <FilledIconButton variant="positive" icon="thumbUp" disabled={disabled} />
      </EvidenceVotingModal>
    </Box>
  );

  if (variant === 'large') {
    return (
      <Box direction="row" gap={4} width="100%">
        <EvidenceVotingModal evidence={evidence} aye={false}>
          <ButtonCard pallet="negative" icon="thumbDown" fullWidth disabled={disabled}>
            {t('fellowship.voting.nay')}
          </ButtonCard>
        </EvidenceVotingModal>
        <EvidenceVotingModal evidence={evidence} aye={true}>
          <ButtonCard pallet="positive" icon="thumbUp" fullWidth disabled={disabled}>
            {t('fellowship.voting.aye')}
          </ButtonCard>
        </EvidenceVotingModal>
      </Box>
    );
  }

  if (variant === 'small') {
    return (
      <Box
        verticalAlign={nonNullable(endBlock) ? 'space-between' : 'flex-end'}
        horizontalAlign="flex-end"
        gap={2}
        height="92px"
        width="102px"
      >
        {nonNullable(endBlock) && <PeriodEndTimer endBlock={endBlock} shortDateFormat />}
        {buttonNodes}
      </Box>
    );
  }

  return null;
});
