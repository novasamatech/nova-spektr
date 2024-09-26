import { useStoreMap, useUnit } from 'effector-react';

import { type ReferendumId } from '@shared/core';
import { Shimmering } from '@shared/ui';
import { detailsAggregate } from '../../aggregates/details';

import { TimelineItem } from './TimelineItem';

type Props = {
  referendumId: ReferendumId;
};

export const Timeline = ({ referendumId }: Props) => {
  const isLoading = useUnit(detailsAggregate.$isTimelinesLoading);
  const timeline = useStoreMap({
    store: detailsAggregate.$timelines,
    keys: [referendumId],
    fn: (timelines, [referendumId]) => timelines[referendumId] ?? null,
  });

  const shouldRenderLoadingState = isLoading && (!timeline || timeline.onChain.length === 0);
  const shouldOnChainData = timeline && timeline.onChain.length > 0 && timeline.offChain.length === 0;
  const shouldOffChainData = !isLoading && timeline && timeline.offChain.length > 0;

  return (
    <div className="flex flex-col gap-3.5">
      {shouldRenderLoadingState && (
        <div className="flex items-center justify-between">
          <Shimmering height={18} width={120} />
          <Shimmering height={18} width={80} />
        </div>
      )}

      {shouldOnChainData &&
        timeline.onChain.map((status) => (
          <TimelineItem key={`${status.status}-${status.date.toLocaleString()}`} item={status} />
        ))}

      {shouldOffChainData &&
        timeline.offChain.map((status) => (
          <TimelineItem key={`${status.status}-${status.date.toLocaleString()}`} item={status} />
        ))}
    </div>
  );
};
