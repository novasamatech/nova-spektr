import { type PropsWithChildren, memo, useMemo } from 'react';

import { useClock, useDeferredList } from '@/shared/lib/hooks';
import { nullable } from '@/shared/lib/utils';
import { Separator } from '@/shared/ui';
import { AsyncItem } from '@/shared/ui-kit';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

import { ActivityPlaceholder } from './ActivityPlaceholder';
import { EventRecord } from './EventRecord';
import { type ActivityFeedItem } from './utils';

type Props = {
  feed: ActivityFeedItem[];
  limit?: number;
  withFullAccountInfo?: boolean;
  pending: boolean;
};

export const ActivityListView = memo(
  ({ limit = Number.POSITIVE_INFINITY, feed, pending, withFullAccountInfo }: PropsWithChildren<Props>) => {
    const feedWithMaxLength = useMemo(() => (limit >= feed.length ? feed : feed.slice(0, limit)), [feed, limit]);

    const now = useClock(60_000);
    const chain = useFellowshipChain();

    const { list, isLoading } = useDeferredList({ list: feedWithMaxLength, isLoading: pending });

    if (nullable(chain)) return null;

    return (
      <div className="flex h-full flex-col pt-2 pb-4">
        {isLoading && placeholders}

        {list.map((event, index) => {
          const key = `${event.block}-${event.accountId}-${event.type}`;
          const isLast = index === list.length - 1;

          return (
            <div key={key} className="flex flex-col">
              <AsyncItem fallback={placeholder}>
                <EventRecord
                  event={event}
                  description={event.description}
                  duration={(now - event.at.getTime()) / 1000}
                  name={event.actorName || event.name}
                  actorAccountId={event.actorAccountId}
                  chain={chain}
                  withFullAccountInfo={withFullAccountInfo}
                  referendumDetails={event.referendumDetails}
                />
              </AsyncItem>
              {!isLast && (
                <div className="px-5">
                  <Separator className="py-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  },
);

const placeholder = <ActivityPlaceholder />;

const placeholders = (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <ActivityPlaceholder key={i} />
    ))}
  </>
);
