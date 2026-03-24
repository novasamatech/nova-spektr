import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import {
  type Referendum,
  referendumService,
  trackService,
  useReferendumMeta,
  votingHistoryService,
} from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';
import { useReferendumVotes } from '../hooks/useReferendumVotes';

export const VotingSummary = ({ referendum }: { referendum: Referendum }) => {
  const { t } = useI18n();

  const { votes, pending } = useReferendumVotes(referendum.id);

  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const provider = useUnit(governanceMetaProvider.$metaProvider);
  const { data: referendumMetas } = useReferendumMeta({
    provider: provider?.type,
    api,
    chain,
    palletType: 'fellowship',
  });

  const referendumMeta = referendumMetas[referendum.id];

  // Get track information - for ongoing referendums use track property, for completed use metadata
  const trackId = useMemo(() => {
    if (referendumService.isOngoing(referendum)) {
      return referendum.track;
    }
    // For completed referendums, get track from metadata
    return referendumMeta?.track ?? null;
  }, [referendum, referendumMeta]);

  const isPromotionReferendum = trackId ? trackService.isPromotionTrack(trackId) : false;
  const isRetentionReferendum = trackId ? trackService.isRetentionTrack(trackId) : false;
  const isPromotionRetentionReferendum = isPromotionReferendum || isRetentionReferendum;

  const votingRating = useMemo(() => votingHistoryService.getApprovalRating(votes), [votes]);

  const { levelTextKey, levelClassName } = useMemo(() => {
    if (votingRating === 'NotGood') {
      return { levelTextKey: 'fellowship.votingHistory.level.notGood', levelClassName: 'text-text-negative' };
    }
    if (votingRating === 'Controversial') {
      return { levelTextKey: 'fellowship.votingHistory.level.controversial', levelClassName: 'text-text-warning' };
    }
    return { levelTextKey: 'fellowship.votingHistory.level.good', levelClassName: 'text-text-positive' };
  }, [votingRating]);

  let title = t('fellowship.votingHistory.default');

  if (referendumService.isCompleted(referendum)) {
    title = isPromotionRetentionReferendum
      ? t('fellowship.votingHistory.voteEndedPromotionRetention')
      : t('fellowship.votingHistory.voteEnded');
  }

  if (referendumService.isOngoing(referendum)) {
    title = isPromotionRetentionReferendum
      ? t('fellowship.votingHistory.subtitlePromotionRetention')
      : t('fellowship.votingHistory.subtitle');

    if (referendum.proposal && referendumService.isSpendProposal(referendum.proposal)) {
      title = t('fellowship.votingHistory.spend');
    }
  }

  if (nullable(votingRating)) {
    title = t('fellowship.votingHistory.noVotes');
  }

  let voteLevel = null;

  if (nonNullable(votingRating)) {
    if (pending) {
      voteLevel = <Skeleton width={12} height="1lh" />;
    } else {
      voteLevel = <span className={levelClassName}>{t(levelTextKey)}</span>;
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center">
        <FootnoteText>
          {title} {voteLevel}
        </FootnoteText>
      </div>
    </div>
  );
};
