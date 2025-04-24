import { useStoreMap } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { AsyncItem } from '@/shared/ui-kit';
import { type FeedRecord } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { identityModel } from '../model/identity';

export const activityFeedRecordDescriptionSlot = createSlot<{ t: TFunction; record: FeedRecord }>();

type Props = {
  event: FeedRecord;
  chain: Chain;
};

const now = Date.now();

export const EventRecord = memo(({ event, chain }: Props) => {
  const { t } = useI18n();

  const identity = useStoreMap({
    store: identityModel.$list,
    keys: [event.accountId],
    fn: (identities, [accountId]) => identities[accountId] ?? null,
  });

  return (
    <AsyncItem spaceToReserve={{ width: '100%', height: '48px' }}>
      <div className="flex flex-col gap-1 px-5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 grow text-button-small">
            <Account
              accountId={event.accountId}
              chain={chain}
              title={identity ? identityService.getFullName(identity) : undefined}
              variant="short"
              hideAddress
            />
          </div>
          <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
            <Duration seconds={(now - event.at.getTime()) / 1000} shortFormat />
          </HelpText>
        </div>
        <FootnoteText className="text-text-secondary">
          <Slot id={activityFeedRecordDescriptionSlot} props={{ t, record: event }} />
        </FootnoteText>
      </div>
    </AsyncItem>
  );
});
