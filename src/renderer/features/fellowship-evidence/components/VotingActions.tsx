import { useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { ButtonCard, SmallTitleText } from '@/shared/ui';
import { PeriodEndTimer } from '@/shared/ui-entities/PeriodEndTimer/PeriodEndTimer';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { Card } from '@/features/fellowship-referendum-details';
import { fellowshipEvidenceFeature } from '../model/feature';
import { members } from '../model/members';

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

  const isPromotion = evidence.wish === 'Promotion';
  const isRetention = evidence.wish === 'Retention';

  const member = useStoreMap({
    store: members.$list,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => list.find(m => m.accountId === accountId) ?? null,
  });

  let title = '';

  if (nonNullable(member) && isPromotion) {
    title = t('fellowship.tasks.titles.votingTitle.rank', { rank: member?.rank + 1 });
  }

  if (nonNullable(member) && isRetention) {
    title = t('fellowship.tasks.titles.votingTitle.rank', { rank: member?.rank });
  }

  let component = null;
  const buttonNodes = (
    <Box direction="row" gap={1}>
      <EvidenceVotingModal evidence={evidence} aye={false}>
        <FilledIconButton variant="negative" icon="negative" disabled={disabled} />
      </EvidenceVotingModal>

      <EvidenceVotingModal evidence={evidence} aye={true}>
        <FilledIconButton variant="positive" icon="positive" disabled={disabled} />
      </EvidenceVotingModal>
    </Box>
  );

  if (variant === 'large') {
    component = (
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

  if (variant === 'small' && nonNullable(input)) {
    component = (
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

  return (
    <Card>
      <Box fillContainer gap={6} padding={6}>
        <SmallTitleText>{title}</SmallTitleText>
        {component}
      </Box>
    </Card>
  );
});
