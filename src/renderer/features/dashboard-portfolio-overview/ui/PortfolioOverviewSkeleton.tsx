import { memo } from 'react';

import { Skeleton } from '@/shared/ui-kit';

export const PortfolioOverviewSkeleton = memo(() => (
  <div>
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2.5">
        <Skeleton width="120px" height="12px" />
        <Skeleton width="180px" height="30px" />
      </div>
      <Skeleton width="150px" height="36px" />
    </div>

    <div className="mt-6">
      <Skeleton width="100%" height="12px" />
    </div>
    <div className="mt-3.5 flex gap-2">
      <Skeleton width="110px" height="30px" />
      <Skeleton width="110px" height="30px" />
      <Skeleton width="110px" height="30px" />
    </div>

    <div className="mt-6 flex items-center gap-5">
      <div className="shrink-0">
        <Skeleton width="200px" circle />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Skeleton width="100%" height="22px" />
        <Skeleton width="100%" height="22px" />
        <Skeleton width="100%" height="22px" />
        <Skeleton width="70%" height="22px" />
      </div>
    </div>
  </div>
));
