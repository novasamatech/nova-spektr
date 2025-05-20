import { useStoreMap, useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { fromRomanNumeral, nonNullable } from '@/shared/lib/utils';
import { FootnoteText, Markdown, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type OngoingReferendum, referendumService, track, trackService } from '@/domains/collectives';
import { ReferendumDetailsModal } from '@/features/fellowship-referendum-details';
import { evidenceModel } from '../../model/evidence';
import { fellowshipTasksFeature } from '../../model/feature';
import { identityModel } from '../../model/identity';
import { votes } from '../../model/voting';
import { MemberActivity } from '../MemberActivity';
import { TaskBadge } from '../TaskBadge';
import { TaskLabels } from '../TaskLabels';
import { VoteBadge } from '../VoteBadge';

import { DefaultDateThresholds, LooseDateThresholds, referendumVotingTaskActionSlot } from './OngoingReferendumVoting';

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

  const currentTrack = relatedTrack?.find(t => t.id === referendum.track);

  const isRetentionTrack = trackService.isRetentionTrack(referendum.track);
  const isPromotionTrack = trackService.isPromotionTrack(referendum.track);

  const dateThresholds = isRetentionTrack ? LooseDateThresholds : DefaultDateThresholds;

  const proposerIdentity = useStoreMap({
    store: identityModel.$identities,
    keys: [referendum],
    fn: (identities, [referendum]) => {
      const proposer = referendumService.getProposer(referendum);
      return proposer ? identities[proposer] : null;
    },
  });

  const title = useMemo(() => {
    if (!proposerIdentity) return '';

    if (!currentTrack) return '';

    const string = isPromotionTrack ? 'fellowship.tasks.titles.promote' : 'fellowship.tasks.titles.retain';
    return t(string, {
      name: proposerIdentity.name,
      rank: trackService.getDanFromTrackName(currentTrack),
    });
  }, [proposerIdentity, isPromotionTrack, isRetentionTrack, t]);

  const rank = useMemo(() => {
    if (!currentTrack) return null;
    const danRoman = trackService.getDanFromTrackName(currentTrack);
    return danRoman ? fromRomanNumeral(danRoman) : null;
  }, [currentTrack]);

  return (
    <Box direction="row" gap={2}>
      <ReferendumDetailsModal referendum={referendum} title={title}>
        <button className="block w-full appearance-none p-4">
          <Box direction="row" gap={2} verticalAlign="start">
            <div className="shrink-0">
              {rank ? <TaskBadge rank={rank} isPromotion={isPromotionTrack} isRetention={isRetentionTrack} /> : null}
            </div>
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
          </Box>
        </button>
      </ReferendumDetailsModal>
      <Box verticalAlign="space-between" horizontalAlign="end" gap={3} padding={4} shrink={0} height="auto">
        <Slot id={referendumVotingTaskActionSlot} props={{ referendum, transaction, dateThresholds }} />
      </Box>
    </Box>
  );
});
