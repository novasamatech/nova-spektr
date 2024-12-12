import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Icon } from '@/shared/ui';
import { Box, Surface } from '@/shared/ui-kit';
import { votingStatusModel } from '../model/votingStatus';

type Props = {
  referendumId: ReferendumId;
};

export const WalletVotingInfo = memo(({ referendumId }: Props) => {
  useGate(votingStatusModel.gate, { referendumId });

  const { t } = useI18n();
  const voting = useUnit(votingStatusModel.$referendumVoting);

  if (nullable(voting)) {
    return null;
  }

  const ayeVotes = voting.aye ? `AYE ${voting.aye} votes` : null;
  const nayVotes = voting.nay ? `NAY ${voting.nay} votes` : null;

  return (
    <Surface>
      <Box direction="row" padding={6} gap={1}>
        <Icon name="voted" size={16} className="text-icon-accent" />
        <span className="text-footnote text-tab-text-accent">{t('fellowship.voting.voted')}</span>
        <span className="text-footnote">
          {ayeVotes} {nayVotes}
        </span>
      </Box>
    </Surface>
  );
});
