import { useUnit } from 'effector-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getRelativeTimeFromApi, nullable } from '@/shared/lib/utils';
import { Button, Duration } from '@/shared/ui';
import { ProgressWithSegments, Skeleton } from '@/shared/ui-kit';
import { type CoreMember, memberService } from '@/domains/collectives';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { getAllRanks } from '../data';
import { READY_FOR_PROMOTION } from '../model/constants';
import { modal } from '../model/modal';
import { promotion } from '../model/promotion';
import { createRankSegmentFellowshipSlot } from '../utils/rankHelpers';

type TimeToNextRank = number | 'ready' | null;

const FellowshipHeader = ({ isLoading }: { isLoading: boolean }) => {
  const { t } = useTranslation();
  const openModal = useUnit(modal.openFellowshipOverviewModal);

  return (
    <div className="flex h-11 shrink-0 items-center justify-between rounded-t-xl border-b border-filter-border bg-card-background pr-2 pl-4">
      <span className="text-button-small">{t('fellowship.overview.title')}</span>
      {isLoading ? (
        <Skeleton width="80px" height="20px" />
      ) : (
        <Button variant="text" pallet="primary" size="sm" onClick={openModal}>
          {t('fellowship.overview.viewDetails')}
        </Button>
      )}
    </div>
  );
};

const useTimeToNextRank = () => {
  const promotionProgress = useUnit(promotion.$promotionProgress);
  const leftToPromotion = useUnit(promotion.$leftToPromotion);
  const currentBlock = useUnit(promotion.$currentBlock);
  const network = useUnit(fellowshipNetwork.$network);
  const [timeToNextRank, setTimeToNextRank] = useState<TimeToNextRank>(null);

  useEffect(() => {
    const calculateTime = async () => {
      if (promotionProgress && promotionProgress.progressPercentage >= 100) {
        setTimeToNextRank(READY_FOR_PROMOTION);
        return;
      }

      if (leftToPromotion && currentBlock && network?.api) {
        const timeInMs = await getRelativeTimeFromApi(leftToPromotion + currentBlock, network.api);
        setTimeToNextRank(timeInMs);
        return;
      }

      setTimeToNextRank(null);
    };

    calculateTime();
  }, [leftToPromotion, currentBlock, network, promotionProgress]);

  return timeToNextRank;
};

const useProgressSegments = () => {
  const member = useUnit(fellowshipMember.$currentMember);
  const promotionProgress = useUnit(promotion.$promotionProgress);

  return useMemo(() => {
    const ranks = getAllRanks();
    const coreMember: CoreMember | null = member && memberService.isCoreMember(member) ? member : null;

    return ranks.map(rank => {
      const segment = createRankSegmentFellowshipSlot(rank);

      if (!coreMember || !promotionProgress) {
        return segment;
      }

      const filled = calculateFilledProgress(rank.rank, coreMember.rank, promotionProgress.progressPercentage);

      return { ...segment, filled };
    });
  }, [member, promotionProgress]);
};

const calculateFilledProgress = (rankLevel: number, currentRank: number, progressPercentage: number): number => {
  if (rankLevel < currentRank) return 1;
  if (rankLevel === currentRank) return progressPercentage / 100;
  return 0;
};

const TimeDisplay = ({ timeToNextRank }: { timeToNextRank: TimeToNextRank }): ReactNode => {
  const { t } = useTranslation();

  if (timeToNextRank === READY_FOR_PROMOTION) {
    return t('fellowship.overview.readyForPromotion');
  }

  if (typeof timeToNextRank === 'number') {
    return (
      <span>
        <Duration seconds={timeToNextRank / 1000} /> {t('fellowship.overview.toNextRank')}
      </span>
    );
  }

  return null;
};

const FellowshipProgress = () => {
  const promotionProgress = useUnit(promotion.$promotionProgress);
  const [isProgressHovered, setIsProgressHovered] = useState(false);
  const timeToNextRank = useTimeToNextRank();
  const segmentsWithProgress = useProgressSegments();

  const currentProgress = promotionProgress?.progressPercentage || 0;
  const hasTimeDisplay = !isProgressHovered && timeToNextRank !== null;

  return (
    <div
      className="flex h-[62px] flex-col gap-2 px-4 pt-3 pb-3"
      onMouseEnter={() => setIsProgressHovered(true)}
      onMouseLeave={() => setIsProgressHovered(false)}
    >
      <ProgressWithSegments
        currentProgress={currentProgress}
        segments={segmentsWithProgress}
        className="w-full"
        isHovered={isProgressHovered}
      />
      <div className="flex h-5 items-center">
        {hasTimeDisplay && (
          <span className="text-footnote text-text-primary">
            <TimeDisplay timeToNextRank={timeToNextRank} />
          </span>
        )}
      </div>
    </div>
  );
};

const FellowshipContentSkeleton = () => (
  <div className="flex h-[62px] flex-col gap-1 px-4 pt-3 pb-3">
    <Skeleton height="24px" />
  </div>
);

export const FellowshipOverview = () => {
  const isLoading = useUnit(promotion.$isLoading);
  const member = useUnit(fellowshipMember.$currentMember);

  const shouldHideCompletely = nullable(member) && !isLoading;

  if (shouldHideCompletely) {
    return null;
  }

  return (
    <div className="flex w-full flex-col rounded-xl border border-filter-border bg-card-background">
      <FellowshipHeader isLoading={isLoading} />
      <div className="rounded-b-xl">{isLoading ? <FellowshipContentSkeleton /> : <FellowshipProgress />}</div>
    </div>
  );
};
