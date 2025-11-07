import { type TFunction } from 'i18next';
import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { createSlot } from '@/shared/di';
import { Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
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
    <div className="flex flex-col gap-1 px-5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 grow text-button-small">
          <Account
            accountId={event.accountId}
            chain={chain}
            title={name}
            variant="short"
            hideAddress
            hideIcon={!withFullAccountInfo}
          />
        </div>
        <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
          <Duration seconds={duration} shortFormat />
        </HelpText>
      </div>
      <FootnoteText className="text-text-secondary">{description}</FootnoteText>
    </div>
  );
});
