import { type TFunction } from 'i18next';
import { memo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { FootnoteText } from '@/shared/ui';
import { type FeedEventReferendum, trackService } from '@/domains/collectives';

export const referendumActivityItemActionSlot = createSlot<{ referendumId: ReferendumId }>();

const getTitle = (record: FeedEventReferendum, t: TFunction): string => {
  if (record.referendumStatus === 'created') {
    return t('fellowship.profile.activityFeed.referendumCreated', { number: record.referendumId });
  } else {
    const isRetention = trackService.isRetentionTrack(record.referendumTrackId);
    const type = isRetention ? 'Retention' : 'Promotion';
    if (record.referendumStatus === 'success') {
      return t('fellowship.profile.activityFeed.referendumSuccess', { type });
    } else {
      return t('fellowship.profile.activityFeed.referendumFailed', { type });
    }
  }
};

type Props = {
  record: FeedEventReferendum;
};

export const ReferendumActivityItem = memo(({ record }: Props) => {
  const { t } = useI18n();

  const title = getTitle(record, t);

  return (
    <div className="flex flex-col gap-1">
      <FootnoteText className="grow font-bold">{title}</FootnoteText>
      {record.referendumId && (
        <Slot id={referendumActivityItemActionSlot} props={{ referendumId: record.referendumId as ReferendumId }} />
      )}
    </div>
  );
});
