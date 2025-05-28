import { useStoreMap } from 'effector-react';
import { useMemo } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Markdown, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, referendumService } from '@/domains/collectives';
import { ReferendumDetailsModal } from '@/features/fellowship-referendum-details';
import { referendums } from '../../model/referendums';
import { tasksService } from '../../service';
import { TaskBadge } from '../TaskBadge';
import { TaskLabels } from '../TaskLabels';

export interface DateThresholds {
  urgent: number;
  warning: number;
}

export const DefaultDateThresholds: DateThresholds = {
  urgent: 5,
  warning: 14,
};

export const LooseDateThresholds: DateThresholds = {
  urgent: 2,
  warning: 8,
};

export const referendumVotingTaskActionSlot = createSlot<{
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  dateThresholds: DateThresholds;
}>();

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  tags: string[];
};

export const OngoingReferendumVoting = ({ referendum, tags, transaction }: Props) => {
  const { t } = useI18n();

  const meta = useStoreMap({
    store: referendums.$metadata,
    keys: [referendum.id],
    fn: (meta, [id]) => meta[id] ?? null,
  });

  const isRFCProposal = referendum.proposal ? referendumService.isRfcProposal(referendum.proposal) : false;
  //todo: whitelist detection might be implemented better
  const isWhitelist = !isRFCProposal;

  const content = useMemo(
    () =>
      meta?.description ? (
        <Markdown cut="150px" compact>
          {tasksService.cutMarkdown(meta.description)}
        </Markdown>
      ) : (
        t('fellowship.tasks.task.anyReferendum.noDescription')
      ),
    [meta],
  );

  return (
    <Box direction="row" gap={2}>
      <ReferendumDetailsModal referendum={referendum}>
        <button className="flex w-full min-w-0 appearance-none gap-2 p-4">
          <Box alignSelf="flex-start" shrink={0}>
            <TaskBadge isRFC={isRFCProposal} isWhitelist={isWhitelist} />
          </Box>
          <Box gap={3}>
            <Box direction="row" gap={3} grow={1}>
              <SmallTitleText className="truncate">
                {meta?.title || t('governance.referendums.referendumTitle', { index: referendum.id })}
              </SmallTitleText>
              <TaskLabels tags={tags} />
            </Box>
            <FootnoteText as="div">{content}</FootnoteText>
          </Box>
        </button>
      </ReferendumDetailsModal>
      <Box gap={3} padding={4} horizontalAlign="end" shrink={0}>
        <Slot
          id={referendumVotingTaskActionSlot}
          props={{ referendum, transaction, dateThresholds: DefaultDateThresholds }}
        />
      </Box>
    </Box>
  );
};
