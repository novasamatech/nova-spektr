import { type ReactNode, memo } from 'react';
import { Trans } from 'react-i18next';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toRomanNumeral } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { FootnoteText } from '@/shared/ui';
import { type FeedEventReferendum } from '@/domains/collectives';
import { type ReferendumDetails } from '../types';

export const referendumEventRecordActionSlot = createSlot<{ referendumId: ReferendumId; children: ReactNode }>();

type Props = {
  record: FeedEventReferendum;
  details: ReferendumDetails;
};

export const ReferendumEventRecord = memo(({ details }: Props) => {
  const { t } = useI18n();
  const { referendumId, targetName, targetRank, isPromotion } = details;

  const LinkComponent = () => (
    <Slot
      id={referendumEventRecordActionSlot}
      props={{
        referendumId,
        children: <span className="cursor-pointer text-primary-button-background-default">#{referendumId}</span>,
      }}
    />
  );

  return (
    <div className="flex flex-col gap-1 break-words">
      <FootnoteText className="grow">
        <Trans
          t={t}
          i18nKey={
            isPromotion ? 'fellowship.activityFeed.referendum.promote' : 'fellowship.activityFeed.referendum.retain'
          }
          components={{ link: <LinkComponent /> }}
          values={{ target: targetName || details.targetAccountId, rank: toRomanNumeral(targetRank) }}
        />
      </FootnoteText>
    </div>
  );
});
