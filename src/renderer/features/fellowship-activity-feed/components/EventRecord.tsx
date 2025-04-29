import { type TFunction } from 'i18next';
import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { createSlot } from '@/shared/di';
import { Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { AsyncItem, Box } from '@/shared/ui-kit';
import { type FeedRecord } from '@/domains/collectives';
import { type ActivityFeedRecord } from '../types';

export const activityFeedRecordDescriptionSlot = createSlot<{ t: TFunction; record: FeedRecord }>();

type Props = {
  event: ActivityFeedRecord;
  chain: Chain;
  isFullVersion?: boolean;
};

export const EventRecord = memo(({ event, chain, isFullVersion }: Props) => {
  return (
    <AsyncItem fallback={<Box width="100%" height="48px"></Box>}>
      <div className="flex flex-col gap-1 px-5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 grow text-button-small">
            <Account
              accountId={event.accountId}
              chain={chain}
              title={event.name}
              variant="short"
              hideAddress
              hideExplorers={!isFullVersion}
              hideIcon={!isFullVersion}
            />
          </div>
          <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
            <Duration seconds={event.duration} shortFormat />
          </HelpText>
        </div>
        <FootnoteText className="text-text-secondary">{event.description}</FootnoteText>
      </div>
    </AsyncItem>
  );
});
