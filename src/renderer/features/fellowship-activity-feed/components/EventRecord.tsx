import { type TFunction } from 'i18next';
import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { createSlot } from '@/shared/di';
import { Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { AsyncItem, Box } from '@/shared/ui-kit';
import { type FeedRecord } from '@/domains/collectives';

export const activityFeedRecordDescriptionSlot = createSlot<{ t: TFunction; record: FeedRecord }>();

export interface ActivityFeedRecord {
  event: FeedRecord;
  chain: Chain;
  duration: number;
  name?: string;
  description?: string;
  withFullAccountInfo?: boolean;
}

type Props = ActivityFeedRecord;

export const EventRecord = memo(({ event, chain, duration, name, description, withFullAccountInfo }: Props) => {
  return (
    <AsyncItem fallback={<Box width="100%" height="48px"></Box>}>
      <div className="flex flex-col gap-1 px-5">
        <div className="flex items-center gap-2">
          <div className="text-button-small min-w-0 grow">
            <Account
              accountId={event.accountId}
              chain={chain}
              title={name}
              variant="short"
              hideAddress
              hideExplorers={!withFullAccountInfo}
              hideIcon={!withFullAccountInfo}
            />
          </div>
          <HelpText className="text-text-secondary max-w-[40%] shrink-0 text-end">
            <Duration seconds={duration} shortFormat />
          </HelpText>
        </div>
        <FootnoteText className="text-text-secondary">{description}</FootnoteText>
      </div>
    </AsyncItem>
  );
});
