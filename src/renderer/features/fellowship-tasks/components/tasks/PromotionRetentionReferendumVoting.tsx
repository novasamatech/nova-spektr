import { useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText, Markdown, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type OngoingReferendum, type Track, referendumService, track, trackService } from '@/domains/collectives';
import { ReferendumDetailsModal } from '@/features/fellowship-referendum-details';
import { evidenceModel } from '../../model/evidence';
import { fellowshipTasksFeature } from '../../model/feature';
import { votes } from '../../model/voting';
import { MemberActivity } from '../MemberActivity';
import { TaskLabels } from '../TaskLabels';
import { VoteBadge } from '../VoteBadge';

import { DefaultDateThresholds, LooseDateThresholds, referendumVotingTaskActionSlot } from './OngoingReferendumVoting';

const getRankTitle = (rank: number, relatedTrack: Track[] | null | undefined) => {
  const name = relatedTrack?.find(t => t.id === rank)?.name;

  if (!name) return '';

  return name.charAt(0).toUpperCase() + name.slice(1);
};

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  tags: string[];
};

export const PromotionRetentionReferendumVoting = memo(({ referendum, tags, transaction }: Props) => {
  const { t } = useI18n();

  const input = useUnit(fellowshipTasksFeature.input);
  const evidenceSummaryPending = useUnit(evidenceModel.requestEvidenceSummary.pending);
  const evidenceSummaryPopulated = useUnit(evidenceModel.$summaryPopulated);
  const evidenceSummaries = useUnit(evidenceModel.$evidencesSummary);
  const tracks = useUnit(track.$list);
  const vote = useStoreMap({
    store: votes.$memberVotes,
    keys: [referendum.id],
    fn: (votes, [id]) => votes.find(v => v.referendumId === id) ?? null,
  });

  const voted = nonNullable(vote);
  const pending = evidenceSummaryPending || !evidenceSummaryPopulated;
  const proposerAccountId = referendumService.getProposer(referendum);
  const evidenceSummary = evidenceSummaries.find(e => e.accountId === proposerAccountId);

  const relatedTrack = input ? tracks.fellowship?.[input.chainId] : null;

  const title = getRankTitle(referendum.track, relatedTrack);

  const isRetentionTrack = trackService.isRetentionTrack(referendum.track);
  const dateThresholds = isRetentionTrack ? LooseDateThresholds : DefaultDateThresholds;

  return (
    <Box direction="row" gap={2}>
      <ReferendumDetailsModal referendum={referendum}>
        <button className="block w-full appearance-none p-4">
          <Box fillContainer verticalAlign="space-between" gap={3} grow={1}>
            <Box gap={3}>
              <Box direction="row" gap={3}>
                <SmallTitleText className="truncate">{title}</SmallTitleText>
                <TaskLabels tags={tags} />
                {voted && <VoteBadge active />}
              </Box>
              {!evidenceSummary?.summary && pending && <Skeleton height="3lh" width="85%" />}
              <FootnoteText as="div">
                {evidenceSummary?.summary ? <Markdown>{evidenceSummary?.summary}</Markdown> : null}
                {!evidenceSummary?.summary && !pending ? t('fellowship.tasks.task.promotionVoting.noEvidence') : null}
              </FootnoteText>
            </Box>
            {proposerAccountId ? <MemberActivity accountId={proposerAccountId} /> : null}
          </Box>
        </button>
      </ReferendumDetailsModal>
      <Box alignSelf="flex-end" gap={3} padding={4} horizontalAlign="end" shrink={0}>
        <Slot id={referendumVotingTaskActionSlot} props={{ referendum, transaction, dateThresholds }} />
      </Box>
    </Box>
  );
});
