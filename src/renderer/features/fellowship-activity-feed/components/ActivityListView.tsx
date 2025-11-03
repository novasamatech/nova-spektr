import { type PropsWithChildren, memo, useMemo } from 'react';

import { useDeferredList } from '@/shared/lib/hooks';
import { nullable } from '@/shared/lib/utils';
import { AsyncItem } from '@/shared/ui-kit';
import { type FeedRecord } from '@/domains/collectives';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

import { ActivityPlaceholder } from './ActivityPlaceholder';
import { EventRecord } from './EventRecord';

type Props = {
  feed: (FeedRecord & { description?: string; duration: number; name?: string })[];
  limit?: number;
  withFullAccountInfo?: boolean;
  pending: boolean;
};

export const ActivityListView = memo(
  ({ limit = Number.POSITIVE_INFINITY, feed, pending, withFullAccountInfo }: PropsWithChildren<Props>) => {
    const feedWithMaxLength = useMemo(
      () => (limit === Number.POSITIVE_INFINITY ? feed : feed.slice(0, limit)),
      [feed, limit],
    );

    const chain = useFellowshipChain();

    const { list, isLoading } = useDeferredList({ list: feedWithMaxLength, isLoading: pending });

    if (nullable(chain)) return null;

    return (
      <div className="flex h-full flex-col gap-y-5 pt-2 pb-4">
        {isLoading && placeholder}

        {list.map(event => (
          <AsyncItem key={`${event.block}-${event.accountId}-${event.type}`} fallback={<ActivityPlaceholder />}>
            <EventRecord
              event={event}
              description={event.description}
              duration={event.duration}
              name={event.name}
              chain={chain}
              withFullAccountInfo={withFullAccountInfo}
            />
          </AsyncItem>
        ))}
      </div>
    );
  },
);

const placeholder = (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <ActivityPlaceholder key={i} />
    ))}
  </>
);
