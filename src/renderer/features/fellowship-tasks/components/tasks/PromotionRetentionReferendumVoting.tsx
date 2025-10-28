import { useStoreMap, useUnit } from 'effector-react';
import { memo, useMemo } from 'react';
import { generatePath } from 'react-router-dom';

import { type Transaction } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toAddress, toRomanNumeral, toShortAddress } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Markdown, Skeleton } from '@/shared/ui-kit';
import { type OngoingReferendum, referendumService, track, trackService } from '@/domains/collectives';
import { navigationModel } from '@/features/navigation';
import { evidenceModel } from '../../model/evidence';
import { fellowshipTasksFeature } from '../../model/feature';
import { identityModel } from '../../model/identity';
import { members } from '../../model/members';
import { MemberActivity } from '../MemberActivity';
import { TaskBadge } from '../TaskBadge';
import { TaskLabels } from '../TaskLabels';

import { DefaultDateThresholds, LooseDateThresholds, referendumVotingTaskActionSlot } from './OngoingReferendumVoting';

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  tags: string[];
};

export const PromotionRetentionReferendumVoting = memo(({ referendum, tags, transaction }: Props) => {
  const { t } = useI18n();

  const evidenceSummaryPending = useUnit(evidenceModel.requestEvidenceSummary.pending);
  const evidenceSummaryPopulated = useUnit(evidenceModel.$summaryPopulated);
  const evidenceSummaries = useUnit(evidenceModel.$evidencesSummary);

  const pending = evidenceSummaryPending || !evidenceSummaryPopulated;
  const proposerAccountId = referendumService.getProposer(referendum);
  const evidenceSummary = evidenceSummaries.find(e => e.accountId === proposerAccountId);

  const isRetentionTrack = trackService.isRetentionTrack(referendum.track);
  const isPromotionTrack = trackService.isPromotionTrack(referendum.track);

  const dateThresholds = isRetentionTrack ? LooseDateThresholds : DefaultDateThresholds;

  const title = useTitle({ referendum });
  const rank = useRank({ referendum });
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
      <button className="block w-full appearance-none p-4" onClick={handleClick}>
        <Box direction="row" gap={2} verticalAlign="start">
          <div className="shrink-0">
            {rank ? <TaskBadge rank={rank} isPromotion={isPromotionTrack} isRetention={isRetentionTrack} /> : null}
          </div>
          <Box fillContainer verticalAlign="space-between" gap={3} grow={1}>
            <Box gap={3}>
              <Box direction="row" gap={3}>
                <SmallTitleText className="truncate">{title}</SmallTitleText>
                <TaskLabels tags={tags} />
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
      <Box verticalAlign="space-between" horizontalAlign="end" gap={3} padding={4} shrink={0} height="auto">
        <Slot id={referendumVotingTaskActionSlot} props={{ referendum, transaction, dateThresholds }} />
      </Box>
    </Box>
  );
});

const useTitle = ({ referendum }: { referendum: OngoingReferendum }) => {
  const { t } = useI18n();

  const input = useUnit(fellowshipTasksFeature.input);
  const tracks = useUnit(track.$list);

  const proposerAccountId = referendumService.getProposer(referendum);

  const chain = input?.chain ?? null;
  const relatedTracks = chain ? tracks.fellowship?.[chain.chainId] : null;

  const currentTrack = relatedTracks?.find(t => t.id === referendum.track);

  const isRetentionTrack = trackService.isRetentionTrack(referendum.track);
  const isPromotionTrack = trackService.isPromotionTrack(referendum.track);

  const proposerIdentity = useStoreMap({
    store: identityModel.$identities,
    keys: [referendum],
    fn: (identities, [referendum]) => {
      const proposer = referendumService.getProposer(referendum);
      return proposer ? identities[proposer] : null;
    },
  });

  const proposerMember = useStoreMap({
    store: members.$list,
    keys: [proposerAccountId],
    fn: (members, [accountId]) => members.find(m => m.accountId === accountId) ?? null,
  });

  return useMemo(() => {
    if (!currentTrack || !relatedTracks || !proposerMember) return '';

    const string = isPromotionTrack ? 'fellowship.tasks.titles.promote' : 'fellowship.tasks.titles.retain';
    const trackName = isPromotionTrack ? 'Promotion' : 'Retention';

    const rank = trackService.getProposalTrack(relatedTracks, proposerMember, trackName);

    return t(string, {
      name:
        proposerIdentity?.name ??
        toShortAddress(toAddress(proposerMember.accountId, { prefix: chain?.addressPrefix }), 5),
      rank: toRomanNumeral(rank),
    });
  }, [proposerIdentity, isPromotionTrack, isRetentionTrack, t, currentTrack, relatedTracks, proposerMember, chain]);
};

const useRank = ({ referendum }: { referendum: OngoingReferendum }) => {
  const input = useUnit(fellowshipTasksFeature.input);
  const tracks = useUnit(track.$list);
  const proposerAccountId = referendumService.getProposer(referendum);

  const chain = input?.chain ?? null;
  const relatedTracks = chain ? tracks.fellowship?.[chain.chainId] : null;

  const currentTrack = relatedTracks?.find(t => t.id === referendum.track);

  const isRetentionTrack = trackService.isRetentionTrack(referendum.track);
  const isPromotionTrack = trackService.isPromotionTrack(referendum.track);

  const proposerMember = useStoreMap({
    store: members.$list,
    keys: [proposerAccountId],
    fn: (members, [accountId]) => members.find(m => m.accountId === accountId) ?? null,
  });

  return useMemo(() => {
    if (!currentTrack || !relatedTracks || !proposerMember) return null;
    const rank = trackService.getProposalTrack(
      relatedTracks,
      proposerMember,
      isPromotionTrack ? 'Promotion' : 'Retention',
    );

    return rank;
  }, [currentTrack, relatedTracks, isPromotionTrack, isRetentionTrack, proposerMember]);
};
