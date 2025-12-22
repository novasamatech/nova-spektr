import React, { useMemo } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type OngoingReferendum, referendumService } from '@/domains/collectives';
import { useMetadata } from '../../hooks/useMetadata';
import { useRfcProposalSummary } from '../../hooks/useRfcProposalSummary';
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

export const ongoingReferendumVotingSlot = createSlot<{
  referendumId: ReferendumId;
  children: React.ReactNode;
}>();

export const referendumVotingTaskActionSlot = createSlot<{
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  dateThresholds: DateThresholds;
}>();

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  tags: string[];
  connectedGovernanceReferendumSummary: string | null;
};

export const OngoingReferendumVoting = ({
  referendum,
  tags,
  transaction,
  connectedGovernanceReferendumSummary,
}: Props) => {
  const { t } = useI18n();

  const { data: meta, pending: pendingMetadata } = useMetadata(referendum);
  const { data: rfc, pending: pendingSummary } = useRfcProposalSummary(referendum);

  const isSpendProposal = referendum.proposal ? referendumService.isSpendProposal(referendum.proposal) : false;
  const isRFCProposal = referendum.proposal ? referendumService.isRfcProposal(referendum.proposal) : false;

  const isPending = useMemo(() => {
    if (!referendum) return false;
    if (isRFCProposal) return pendingSummary;
    return pendingMetadata;
  }, [referendum, isRFCProposal, pendingSummary, pendingMetadata]);

  const content = useMemo(() => {
    if (isPending) return;

    if (connectedGovernanceReferendumSummary) {
      return (
        <ReferendumTaskMarkdown compact>
          {tasksService.cutMarkdown(connectedGovernanceReferendumSummary)}
        </ReferendumTaskMarkdown>
      );
    }

    if (rfc?.summary) {
      return <ReferendumTaskMarkdown compact>{tasksService.cutMarkdown(rfc.summary)}</ReferendumTaskMarkdown>;
    }

    if (meta?.description) {
      return <ReferendumTaskMarkdown compact>{tasksService.cutMarkdown(meta.description)}</ReferendumTaskMarkdown>;
    }

    return t('fellowship.tasks.task.anyReferendum.noDescription');
  }, [meta, rfc, isPending, connectedGovernanceReferendumSummary, t]);

  const title = useMemo(() => {
    return isSpendProposal
      ? t('governance.referendums.spendReferendumTitle')
      : t('governance.referendums.referendumTitle', { index: referendum.id });
  }, [isSpendProposal, referendum.id]);

  return (
    <Box direction="row" gap={2}>
      <Slot
        id={ongoingReferendumVotingSlot}
        props={{
          referendumId: referendum.id,
          children: (
            <div className="flex w-full min-w-0 cursor-pointer appearance-none gap-2 p-4">
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
            </div>
          ),
        }}
      />
      <Box height="auto" horizontalAlign="end" gap={3} padding={4} shrink={0}>
        <Slot
          id={referendumVotingTaskActionSlot}
          props={{ referendum, transaction, dateThresholds: DefaultDateThresholds }}
        />
      </Box>
    </Box>
  );
};
