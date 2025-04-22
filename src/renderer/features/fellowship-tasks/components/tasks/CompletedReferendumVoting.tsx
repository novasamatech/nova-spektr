import { useStoreMap } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText, Icon, type IconNames, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type CompletedReferendum } from '@/domains/collectives';
import { referendums } from '../../model/referendums';
import { votes } from '../../model/voting';
import { VoteBadge } from '../VoteBadge/VoteBadge';

const getStatusLabel = (type: CompletedReferendum['type'], t: TFunction): { icon: IconNames; label: string } => {
  switch (type) {
    case 'Approved':
      return { icon: 'votingCheckFilled', label: t('governance.referendums.approved') };
    case 'TimedOut':
      return { icon: 'clock', label: t('governance.referendums.timedOut') };
    case 'Rejected':
      return { icon: 'votingCheckFilled', label: t('governance.referendums.rejected') };
    case 'Cancelled':
      return { icon: 'votingCheckFilled', label: t('governance.referendums.canceled') };
    case 'Killed':
      return { icon: 'votingCheckFilled', label: t('governance.referendums.killed') };
  }
};

type Props = {
  referendum: CompletedReferendum;
  onReferendumSelect(referendum: CompletedReferendum): void;
};

export const CompletedReferendumVoting = memo(({ referendum, onReferendumSelect }: Props) => {
  const { t } = useI18n();

  const meta = useStoreMap({
    store: referendums.$metadata,
    keys: [referendum.id],
    fn: (meta, [id]) => meta[id] ?? null,
  });
  const vote = useStoreMap({
    store: votes.$memberVotes,
    keys: [referendum.id],
    fn: (votes, [id]) => votes.find(v => v.referendumId === id) ?? null,
  });

  const voted = nonNullable(vote);
  const type = referendum.type;
  const label = getStatusLabel(type, t);

  return (
    <button className="block w-full appearance-none" onClick={() => onReferendumSelect(referendum)}>
      <Box direction="row" fillContainer padding={4} gap={3}>
        <Box grow={1} direction="row" gap={3}>
          <SmallTitleText>
            {meta?.title || t('governance.referendums.referendumTitle', { index: referendum.id })}
          </SmallTitleText>

          {voted && <VoteBadge active={false} />}
        </Box>
        <Box direction="row" verticalAlign="center" gap={1}>
          <Icon className="text-icon-hover" name={label.icon} size={16} />
          <FootnoteText className="text-text-secondary">{label.label}</FootnoteText>
        </Box>
      </Box>
    </button>
  );
});
