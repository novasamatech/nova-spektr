import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo } from 'react';
import { Trans } from 'react-i18next';

import { type Chain } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { referendaPallet } from '@/shared/pallet/referenda';
import { Duration, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { type FeedRecord, $ipfsGateways, evidenceService } from '@/domains/collectives';
import { NamedAccount } from '@/widgets/NameResolver';
import { type ReferendumDetails } from '../types';

import { ReferendumEventRecord, referendumEventRecordActionSlot } from './ReferendumEventRecord';

export const activityFeedRecordDescriptionSlot = createSlot<{ t: TFunction; record: FeedRecord }>();

export interface ActivityFeedRecord {
  event: FeedRecord;
  chain: Chain;
  duration: number;
  name?: string;
  description?: string;
  actorAccountId?: string;
  withFullAccountInfo?: boolean;
  referendumDetails?: ReferendumDetails;
}

type Props = ActivityFeedRecord;

export const EventRecord = memo(
  ({ event, chain, duration, name, description, withFullAccountInfo, actorAccountId, referendumDetails }: Props) => {
    const isReferendumEvent = event.type === 'referendum' && referendumDetails;

    const displayAccountIdRaw = isReferendumEvent && actorAccountId ? actorAccountId : event.accountId;
    const displayAccountId = toAccountId(displayAccountIdRaw);

    return (
      <div className="flex flex-col gap-1 px-5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 grow text-button-small">
            {withFullAccountInfo ? (
              <NamedAccount accountId={displayAccountId} chain={chain} variant="truncate" hideAddress />
            ) : (
              <Address
                address={toAddress(displayAccountId, { prefix: chain.addressPrefix })}
                title={name}
                variant="truncate"
                showIcon={false}
                hideAddress
              />
            )}
          </div>
          <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
            <Duration seconds={duration} shortFormat />
          </HelpText>
        </div>
        <EventRecordBody event={event} description={description} referendumDetails={referendumDetails} />
      </div>
    );
  },
);

type EventRecordBodyProps = {
  event: FeedRecord;
  description?: string;
  referendumDetails?: ReferendumDetails;
};

const EventRecordBody = ({ event, description, referendumDetails }: EventRecordBodyProps) => {
  const { t } = useI18n();
  const gateways = useUnit($ipfsGateways);
  const evidenceUrls = event.type === 'requested' ? evidenceService.getEvidenceGatewayUrls(event.hash, gateways) : [];

  if (event.type === 'referendum') {
    if (referendumDetails) {
      return <ReferendumEventRecord record={event} details={referendumDetails} />;
    }

    return (
      <FootnoteText className="break-words text-text-secondary">
        <Trans
          t={t}
          i18nKey="fellowship.activityFeed.record.referendumFallback"
          values={{ referendumId: event.referendumId }}
          components={{
            link: (
              <Slot
                id={referendumEventRecordActionSlot}
                props={{
                  referendumId: referendaPallet.helpers.toReferendumId(event.referendumId),
                  children: (
                    <span className="cursor-pointer text-primary-button-background-default">#{event.referendumId}</span>
                  ),
                }}
              />
            ),
          }}
        />
      </FootnoteText>
    );
  }

  if (event.type === 'requested' && description) {
    return (
      <FootnoteText className="text-text-secondary">
        <Trans
          t={t}
          i18nKey={
            event.wish === 'Promotion'
              ? 'fellowship.activityFeed.record.submittedPromotion'
              : 'fellowship.activityFeed.record.submittedRetention'
          }
          components={[
            <span key="evidence-links">
              evidence (
              {evidenceUrls.map((url, index) => (
                <span key={url.toString()}>
                  {index > 0 && ', '}
                  <a
                    href={url.toString()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary-button-background-default"
                  >
                    {url.host}
                    <Icon name="link" size={16} className="text-icon-accent" />
                  </a>
                </span>
              ))}
              )
            </span>,
          ]}
        />
      </FootnoteText>
    );
  }

  if (description) {
    return <FootnoteText className="text-text-secondary">{description}</FootnoteText>;
  }

  return null;
};
