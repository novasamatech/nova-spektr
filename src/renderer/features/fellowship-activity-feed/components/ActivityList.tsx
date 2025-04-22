import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { BodyText, Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { type FeedRecord } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { fellowshipActivityFeedFeature } from '../model/feature';
import { identityModel } from '../model/identity';
import { activityFeed } from '../model/list';

import { ActivityPlaceholder } from './ActivityPlaceholder';

const $feed = activityFeed.$activityFeed.map(feed => feed.slice(0, 20));

export const activityFeedRecordDescriptionSlot = createSlot<{ t: TFunction; record: FeedRecord }>();

export const ActivityList = memo(() => {
  const { t } = useI18n();
  const feed = useUnit($feed);
  const input = useUnit(fellowshipActivityFeedFeature.input);
  const identities = useUnit(identityModel.$list);

  const { list, isLoading } = useDeferredList({ list: feed, isLoading: feed.length === 0 });

  const now = Date.now();

  return (
    <div className="flex flex-col gap-3 pb-3">
      {isLoading || nullable(input) ? Array.from({ length: 5 }).map((_, i) => <ActivityPlaceholder key={i} />) : null}
      {list.map(record => {
        const identity = identities[record.accountId];

        return (
          <div
            key={`${record.block}-${record.accountId}-${record.type}`}
            className="flex flex-col gap-1 pe-4 ps-6 pt-2"
          >
            <div className="flex items-center gap-2 text-button-small">
              <div className="min-w-0 grow">
                {nonNullable(input?.chain) && (
                  <BodyText>
                    <Address
                      title={identity ? identityService.getFullName(identity) : undefined}
                      hideAddress
                      variant="short"
                      address={toAddress(record.accountId, { prefix: input.chain.addressPrefix })}
                    />
                  </BodyText>
                )}
              </div>
              <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
                <Duration seconds={(now - record.at.getTime()) / 1000} shortFormat />
              </HelpText>
            </div>
            <FootnoteText className="text-text-secondary">
              <Slot id={activityFeedRecordDescriptionSlot} props={{ t, record }} />
            </FootnoteText>
          </div>
        );
      })}
    </div>
  );
});
