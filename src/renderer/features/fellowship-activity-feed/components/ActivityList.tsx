import { useUnit } from 'effector-react';
import { memo } from 'react';

import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { identityService } from '@/domains/network';
import { fellowshipActivityFeedFeature } from '../model/feature';
import { identityModel } from '../model/identity';
import { activityFeed } from '../model/list';

import { ActivityPlaceholder } from './ActivityPlaceholder';
import { activityFeedRecordDescriptionSlot } from './EventRecord';

const $feed = activityFeed.$activityFeed.map(feed => feed.slice(0, 20));

export const ActivityList = memo(() => {
  const { t } = useI18n();
  const feed = useUnit($feed);
  const input = useUnit(fellowshipActivityFeedFeature.input);
  const identities = useUnit(identityModel.$list);

  const { list, isLoading } = useDeferredList({ list: feed, isLoading: feed.length === 0 });

  const now = Date.now();

  return (
    <div className="flex flex-col gap-3 py-4 pb-3">
      {isLoading || nullable(input) ? Array.from({ length: 5 }).map((_, i) => <ActivityPlaceholder key={i} />) : null}
      {list.map(record => {
        const identity = identities[record.accountId];

        return (
          <div key={`${record.block}-${record.accountId}-${record.type}`} className="flex flex-col gap-1 pe-4 ps-4">
            <div className="flex items-center gap-2 text-button-small">
              <div className="min-w-0 grow text-button-small">
                {nonNullable(input?.chain) && (
                  <Address
                    title={identity ? identityService.getFullName(identity) : undefined}
                    hideAddress
                    variant="short"
                    address={toAddress(record.accountId, { prefix: input.chain.addressPrefix })}
                  />
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
