import { memo, useMemo } from 'react';
import { generatePath } from 'react-router-dom';

import { type Transaction } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toAddress, toRomanNumeral, toShortAddress } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Markdown, Skeleton } from '@/shared/ui-kit';
import {
  type OngoingReferendum,
  referendumService,
  trackService,
  useEvidenceSummary,
  useMember,
  useTracks,
} from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain, useFellowshipIdentity } from '@/aggregates/fellowship-network';
import { navigationModel } from '@/features/navigation';
import { useEvidence } from '../../hooks/useEvidence';
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

  const proposerAccountId = referendumService.getProposer(referendum);

  const chain = useFellowshipChain();

  const { data: evidenceSummary, pending } = useReferendumSummary({ referendum });

  const isRetentionTrack = trackService.isRetentionTrack(referendum.track);
  const isPromotionTrack = trackService.isPromotionTrack(referendum.track);

  const dateThresholds = isRetentionTrack ? LooseDateThresholds : DefaultDateThresholds;

  const title = useTitle({ referendum });
  const rank = useRank({ referendum });

  const handleClick = () => {
    if (chain) {
      const path = generatePath(Paths.FELLOWSHIP_REFERENDUM, {
        chainId: chain.chainId,
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
              {!evidenceSummary && pending && <Skeleton height="3lh" width="85%" />}
              <FootnoteText as="div">
                {evidenceSummary ? <Markdown>{evidenceSummary?.summary}</Markdown> : null}
                {!evidenceSummary && !pending ? t('fellowship.tasks.task.promotionVoting.noEvidence') : null}
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

  const proposerAccountId = referendumService.getProposer(referendum);

  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: tracks } = useTracks({ palletType: 'fellowship', api });
  const { data: identity } = useFellowshipIdentity(proposerAccountId);

  const currentTrack = tracks?.find(t => t.id === referendum.track);

  const isRetentionTrack = trackService.isRetentionTrack(referendum.track);
  const isPromotionTrack = trackService.isPromotionTrack(referendum.track);

  const { data: proposerMember } = useMember({ palletType: 'fellowship', api, accountId: proposerAccountId });

  return useMemo(() => {
    if (!currentTrack || !proposerMember) return '';

    const string = isPromotionTrack ? 'fellowship.tasks.titles.promote' : 'fellowship.tasks.titles.retain';
    const trackName = isPromotionTrack ? 'Promotion' : 'Retention';

    const rank = trackService.getProposalTrack(tracks, proposerMember, trackName);

    return t(string, {
      name: identity?.name ?? toShortAddress(toAddress(proposerMember.accountId, { prefix: chain?.addressPrefix }), 5),
      rank: toRomanNumeral(rank),
    });
  }, [identity, isPromotionTrack, isRetentionTrack, t, currentTrack, tracks, proposerMember, chain]);
};

const useRank = ({ referendum }: { referendum: OngoingReferendum }) => {
  const proposerAccountId = referendumService.getProposer(referendum);

  const api = useFellowshipApi();
  const { data: tracks } = useTracks({ palletType: 'fellowship', api });
  const { data: proposerMember } = useMember({ palletType: 'fellowship', api, accountId: proposerAccountId });

  const currentTrack = tracks?.find(t => t.id === referendum.track);
  const isRetentionTrack = trackService.isRetentionTrack(referendum.track);
  const isPromotionTrack = trackService.isPromotionTrack(referendum.track);

  return useMemo(() => {
    if (!currentTrack || !tracks || !proposerMember) return null;
    const rank = trackService.getProposalTrack(tracks, proposerMember, isPromotionTrack ? 'Promotion' : 'Retention');

    return rank;
  }, [currentTrack, tracks, isPromotionTrack, isRetentionTrack, proposerMember]);
};

const useReferendumSummary = ({ referendum }: { referendum: OngoingReferendum }) => {
  const proposerAccountId = referendumService.getProposer(referendum);

  const chain = useFellowshipChain();

  const { data: evidence, pending: pendingEvidence } = useEvidence(proposerAccountId);
  const { data: evidenceSummary, pending: pendingSummary } = useEvidenceSummary({
    palletType: 'fellowship',
    chainId: chain?.chainId,
    accountId: proposerAccountId,
    evidence: evidence?.hash,
  });

  return { data: evidenceSummary, pending: pendingEvidence || pendingSummary };
};
