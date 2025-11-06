import { type TFunction } from 'i18next';
import React, { memo, useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { FootnoteText, Icon, type IconNames, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type CompletedReferendum } from '@/domains/collectives';
import { useMetadata } from '../../hooks/useMetadata';
import { tasksService } from '../../service';
import { ReferendumTaskMarkdown } from '../ReferendumTaskMarkdown';

export const completedReferendumVotingSlot = createSlot<{
  referendumId: ReferendumId;
  children: React.ReactNode;
}>();

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

  const { data: meta } = useMetadata(referendum);

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
    <Slot
      id={completedReferendumVotingSlot}
      props={{
        referendumId: referendum.id,
        children: (
          <div className="flex w-full appearance-none flex-col gap-3 p-4">
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
          </div>
        ),
      }}
    />
  );
});
