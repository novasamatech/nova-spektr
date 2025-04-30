import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { AsyncItem, Box } from '@/shared/ui-kit';
import { type FeedRecord } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { identityModel } from '../model/identity';

import { getDescription } from './utils';

export const activityFeedRecordDescriptionSlot = createSlot<{ t: TFunction; record: FeedRecord }>();

type Props = {
  event: FeedRecord;
  chain: Chain;
  withFullAccountInfo?: boolean;
};

const now = Date.now();

export const EventRecord = memo(({ event, chain, withFullAccountInfo }: Props) => {
  const { t } = useI18n();
  const identities = useUnit(identityModel.$list);
  const identity = identities[event.accountId];

  const name = identity ? identityService.getFullName(identity) : undefined;

  const description = getDescription(event, t);

  const duration = (now - event.at.getTime()) / 1000;

  return (
    <AsyncItem fallback={<Box width="100%" height="48px"></Box>}>
      <div className="flex flex-col gap-1 px-5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 grow text-button-small">
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
          <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
            <Duration seconds={duration} shortFormat />
          </HelpText>
        </div>
        <FootnoteText className="text-text-secondary">{description}</FootnoteText>
      </div>
    </AsyncItem>
  );
});
