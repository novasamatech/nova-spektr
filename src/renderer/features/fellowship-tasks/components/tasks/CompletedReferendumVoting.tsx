import { useStoreMap } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon, type IconNames, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type CompletedReferendum } from '@/domains/collectives';
import { ReferendumDetailsModal } from '@/features/fellowship-referendum-details';
import { referendums } from '../../model/referendums';
import { tasksService } from '../../service';
import { ReferendumTaskMarkdown } from '../ReferendumTaskMarkdown';

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
};

export const CompletedReferendumVoting = memo(({ referendum }: Props) => {
  const { t } = useI18n();

  const meta = useStoreMap({
    store: referendums.$metadata,
    keys: [referendum.id],
    fn: (meta, [id]) => meta[id] ?? null,
  });

  const type = referendum.type;
  const label = getStatusLabel(type, t);

  const content = useMemo(
    () =>
      meta?.description ? (
        <ReferendumTaskMarkdown compact>{tasksService.cutMarkdown(meta.description)}</ReferendumTaskMarkdown>
      ) : (
        t('fellowship.tasks.task.anyReferendum.noDescription')
      ),
    [meta],
  );

  return (
    <ReferendumDetailsModal referendum={referendum}>
      <button className="flex w-full appearance-none flex-col gap-3 p-4">
        <Box direction="row" fillContainer gap={3}>
          <Box grow={1} direction="row" gap={3}>
            <SmallTitleText>
              {meta?.title || t('governance.referendums.referendumTitle', { index: referendum.id })}
            </SmallTitleText>
          </Box>
          <Box direction="row" verticalAlign="center" gap={1}>
            <Icon className="text-icon-hover" name={label.icon} size={16} />
            <FootnoteText className="text-text-secondary">{label.label}</FootnoteText>
          </Box>
        </Box>
        <Box width="80%">
          <FootnoteText as="div">{content}</FootnoteText>
        </Box>
      </button>
    </ReferendumDetailsModal>
  );
});
