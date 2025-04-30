import { useUnit } from 'effector-react';
import { type PropsWithChildren, useMemo } from 'react';

import { useDeferredList } from '@/shared/lib/hooks';
import { nullable } from '@/shared/lib/utils';
import { type FeedRecord } from '@/domains/collectives';
import { fellowshipActivityFeedFeature } from '../model/feature';

import { ActivityPlaceholder } from './ActivityPlaceholder';
import { EventRecord } from './EventRecord';

type Props = {
  feed: FeedRecord[];
  limit: number;
  withFullAccountInfo?: boolean;
};

export const ActivityListView = ({ limit, feed, withFullAccountInfo }: PropsWithChildren<Props>) => {
  const feedWithMaxLength = useMemo(() => feed.slice(0, limit), [feed, limit]);

  const input = useUnit(fellowshipActivityFeedFeature.input);

  const { list, isLoading } = useDeferredList({ list: feedWithMaxLength, isLoading: feedWithMaxLength.length === 0 });

  if (nullable(input)) return null;

  return (
    <div className="flex h-full flex-col gap-y-5 pb-4 pt-2">
      {isLoading && Array.from({ length: 5 }).map((_, i) => <ActivityPlaceholder key={i} />)}

      {list.map(event => (
        <EventRecord
          key={`${event.block}-${event.accountId}-${event.type}`}
          event={event}
          chain={input.chain}
          withFullAccountInfo={withFullAccountInfo}
        />
      ))}
    </div>
  );
};
