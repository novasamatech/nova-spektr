import { useStoreMap, useUnit } from 'effector-react';
import { useMemo } from 'react';
import { generatePath } from 'react-router-dom';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type OngoingReferendum, referendumService } from '@/domains/collectives';
import { navigationModel } from '@/features/navigation';
import { fellowshipTasksFeature } from '../../model/feature';
import { referendums } from '../../model/referendums';
import { rfcModel } from '../../model/rfc';
import { tasksService } from '../../service';
import { ReferendumTaskMarkdown } from '../ReferendumTaskMarkdown';
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

  const rfc = useStoreMap({
    store: rfcModel.$rfcSummary,
    keys: [referendum.proposal],
    fn: (summary, [proposal]) =>
      summary && proposal && referendumService.isRfcProposal(proposal) ? summary[proposal.pullRequest] : null,
  });

  const isRFCPending = useUnit(rfcModel.$isPending);
  const isMetaPending = useUnit(referendums.$pendingReferendumMeta);

  const isRFCProposal = referendum.proposal ? referendumService.isRfcProposal(referendum.proposal) : false;

  const isPending = referendum && (isRFCProposal ? isRFCPending : isMetaPending);

  const content = useMemo(() => {
    if (isPending) return;

    if (rfc?.summary) {
      return <ReferendumTaskMarkdown compact>{tasksService.cutMarkdown(rfc.summary)}</ReferendumTaskMarkdown>;
    }

    if (meta?.description) {
      return <ReferendumTaskMarkdown compact>{tasksService.cutMarkdown(meta.description)}</ReferendumTaskMarkdown>;
    }

    return t('fellowship.tasks.task.anyReferendum.noDescription');
  }, [meta, rfc, isPending]);

  const title = useMemo(() => {
    const isSpendProposal = referendum.proposal ? referendumService.isSpendProposal(referendum.proposal) : false;

    return isSpendProposal
      ? t('governance.referendums.spendReferendumTitle')
      : t('governance.referendums.referendumTitle', { index: referendum.id });
  }, [referendum.proposal]);

  const input = useUnit(fellowshipTasksFeature.input);

  const handleClick = () => {
    if (input?.chainId) {
      const path = generatePath(Paths.FELLOWSHIP_REFERENDUM, {
        chainId: input.chainId,
        referendumId: referendum.id.toString(),
      });
      navigationModel.events.navigateTo(path);
    }
  };

  return (
    <Box direction="row" gap={2}>
      <button className="flex w-full min-w-0 cursor-pointer appearance-none gap-2 p-4" onClick={handleClick}>
        <Box alignSelf="flex-start" shrink={0}>
          <TaskBadge proposal={referendum.proposal} />
        </Box>
        <Box fillContainer gap={3} grow={1}>
          <Box direction="row" gap={3} grow={1}>
            <SmallTitleText className="truncate">{title}</SmallTitleText>
            <TaskLabels tags={tags} />
          </Box>
          <Box width="90%">
            {isPending && <Skeleton height="2.5lh" width="95%" />}
            <FootnoteText as="div">{content}</FootnoteText>
          </Box>
        </Box>
      </button>
      <Box height="auto" horizontalAlign="end" gap={3} padding={4} shrink={0}>
        <Slot
          id={referendumVotingTaskActionSlot}
          props={{ referendum, transaction, dateThresholds: DefaultDateThresholds }}
        />
      </Box>
    </Box>
  );
};
