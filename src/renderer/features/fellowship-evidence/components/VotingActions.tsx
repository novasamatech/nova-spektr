import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { ButtonCard } from '@/shared/ui';
import { PeriodEndTimer } from '@/shared/ui-entities/PeriodEndTimer/PeriodEndTimer';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { fellowshipEvidenceFeature } from '../model/feature';

import { EvidenceVotingModal } from './EvidenceVotingModal';

type Props = {
  evidence: Evidence;
  endBlock: number | null;
  variant: 'large' | 'small';
  disabled: boolean;
};

export const VotingActions = memo(({ evidence, endBlock, variant, disabled }: Props) => {
  const { t } = useI18n();
  const input = useUnit(fellowshipEvidenceFeature.input);

  if (variant === 'large') {
    return (
      <Box fillContainer gap={4}>
        <Box direction="row" gap={4} width="100%">
          <EvidenceVotingModal evidence={evidence} aye={false}>
            <ButtonCard pallet="negative" icon="negative" fullWidth disabled={disabled}>
              {t('fellowship.voting.notGood')}
            </ButtonCard>
          </EvidenceVotingModal>
          <EvidenceVotingModal evidence={evidence} aye={true}>
            <ButtonCard pallet="positive" icon="positive" fullWidth disabled={disabled}>
              {t('fellowship.voting.good')}
            </ButtonCard>
          </EvidenceVotingModal>
        </Box>
      </Box>
    );
  }

  const buttonNodes = (
    <Box direction="row" gap={1}>
      {!disabled && (
        <>
          <EvidenceVotingModal evidence={evidence} aye={false}>
            <FilledIconButton variant="negative" icon="negative" disabled={disabled} />
          </EvidenceVotingModal>
          <EvidenceVotingModal evidence={evidence} aye={true}>
            <FilledIconButton variant="positive" icon="positive" disabled={disabled} />
          </EvidenceVotingModal>
        </>
      )}
      {disabled && (
        <>
          <FilledIconButton variant="negative" icon="negative" disabled={disabled} />
          <FilledIconButton variant="positive" icon="positive" disabled={disabled} />
        </>
      )}
    </Box>
  );

  if (variant === 'small' && nonNullable(input)) {
    return (
      <Box
        verticalAlign={nonNullable(endBlock) ? 'space-between' : 'flex-end'}
        horizontalAlign="flex-end"
        gap={2}
        height="92px"
        width="102px"
      >
        {nonNullable(endBlock) && <PeriodEndTimer api={input.api} endBlock={endBlock} shortDateFormat />}
        {buttonNodes}
      </Box>
    );
  }

  return null;
});
