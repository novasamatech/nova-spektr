import { type PropsWithChildren, useMemo } from 'react';

import { useDeferredList } from '@/shared/lib/hooks';
import { nullable } from '@/shared/lib/utils';
import { type FeedRecord } from '@/domains/collectives';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

import { ActivityPlaceholder } from './ActivityPlaceholder';
import { EventRecord } from './EventRecord';

type Props = {
  feed: (FeedRecord & { description?: string; duration: number; name?: string })[];
  limit: number;
  withFullAccountInfo?: boolean;
};

export const ActivityListView = ({ limit, feed, withFullAccountInfo }: PropsWithChildren<Props>) => {
  const feedWithMaxLength = useMemo(() => feed.slice(0, limit), [feed, limit]);

  const chain = useFellowshipChain();

  const { list, isLoading } = useDeferredList({ list: feedWithMaxLength });

  if (nullable(chain)) return null;

  return (
    <div className="flex h-full flex-col gap-y-5 pt-2 pb-4">
      {isLoading && Array.from({ length: 5 }).map((_, i) => <ActivityPlaceholder key={i} />)}

      {list.map(event => (
        <EventRecord
          key={`${event.block}-${event.accountId}-${event.type}`}
          event={event}
          description={event.description}
          duration={event.duration}
          name={event.name}
          chain={chain}
          withFullAccountInfo={withFullAccountInfo}
        />
      ))}
    </div>
  );
};
