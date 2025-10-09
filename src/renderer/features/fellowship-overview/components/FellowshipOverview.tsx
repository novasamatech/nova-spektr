import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getRelativeTimeFromApi } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { ProgressWithSegments, Skeleton } from '@/shared/ui-kit';
import { memberService } from '@/domains/collectives';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { type RankData, getAllRanks } from '../data';
import { openFellowshipOverviewModal } from '../model/modal';
import { promotion } from '../model/promotion';

const getRankWidth = (rank: number): number => {
  if (rank === 1) return 16;
  if (rank === 2) return 20;
  if (rank >= 3 && rank <= 5) return 28;
  if (rank >= 6 && rank <= 7) return 32;
  return 44;
};

const createRankSegment = (rank: RankData) => ({
  id: `rank-${rank.rank}`,
  label: rank.label,
  width: getRankWidth(rank.rank),
  color: rank.color,
  filled: 0,
});

export const FellowshipOverview = () => {
  const { t } = useTranslation();
  const openModal = useUnit(openFellowshipOverviewModal);
  const promotionProgress = useUnit(promotion.$promotionProgress);
  const leftToPromotion = useUnit(promotion.$leftToPromotion);
  const currentBlock = useUnit(fellowshipNetwork.$currentBlock);
  const network = useUnit(fellowshipNetwork.$network);
  const member = useUnit(fellowshipMember.$currentMember);
  const isLoading = useUnit(promotion.$isLoading);

  const [isProgressHovered, setIsProgressHovered] = useState(false);

  const currentProgress = promotionProgress?.progressPercentage || 0;

  const segmentsWithProgress = useMemo(() => {
    const ranks = getAllRanks();

    return ranks.map(rank => {
      const segment = createRankSegment(rank);

      if (!member || !memberService.isCoreMember(member) || !promotionProgress) {
        return segment;
      }

      const currentRank = member.rank;
      let filled = 0;

      if (rank.rank < currentRank) {
        filled = 1;
      } else if (rank.rank === currentRank) {
        filled = promotionProgress.progressPercentage / 100;
      }

      return {
        ...segment,
        filled,
      };
    });
  }, [member, promotionProgress]);

  const timeToNextRank =
    leftToPromotion && currentBlock && network?.api
      ? getRelativeTimeFromApi(leftToPromotion + currentBlock, network.api)
      : currentProgress >= 100
        ? t('fellowship.overview.readyForPromotion')
        : null;

  return (
    <div className="w-[324px] flex-col overflow-hidden rounded-xl border border-filter-border bg-card-background">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-filter-border bg-card-background pr-2 pl-4">
        <span className="text-button-small">{t('fellowship.overview.title')}</span>
        <Button variant="text" pallet="primary" size="sm" onClick={openModal}>
          {t('fellowship.overview.viewDetails')}
        </Button>
      </div>

      <div
        className="flex flex-col gap-2 px-4 pt-4 pb-4"
        onMouseEnter={() => setIsProgressHovered(true)}
        onMouseLeave={() => setIsProgressHovered(false)}
      >
        {isLoading ? (
          <Skeleton height="32px" />
        ) : (
          <>
            <ProgressWithSegments
              currentProgress={currentProgress}
              segments={segmentsWithProgress}
              className="h-2 w-full"
              isHovered={isProgressHovered}
            />
            {timeToNextRank && (
              <span
                className="min-h-18 text-footnote text-text-primary"
                style={{ visibility: isProgressHovered ? 'hidden' : 'visible' }}
              >
                {timeToNextRank}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
