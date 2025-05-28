import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { Card } from '@/features/fellowship-referendum-details';
import { members } from '../model/members';

import { VotingActions } from './VotingActions';

type Props = {
  evidence: Evidence;
  endBlock: number | null;
  variant: 'large' | 'small';
  disabled: boolean;
};

export const VotingActionsCard = memo(({ evidence, endBlock, variant, disabled }: Props) => {
  const { t } = useI18n();

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

  return (
    <Card>
      <Box fillContainer gap={6} padding={6}>
        <SmallTitleText>{title}</SmallTitleText>
        <VotingActions evidence={evidence} endBlock={endBlock} variant={variant} disabled={disabled} />
      </Box>
    </Card>
  );
});
